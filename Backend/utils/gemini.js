import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import dotenv from 'dotenv';
import YahooFinance from 'yahoo-finance2';
import { fetchStockNews } from './news.js';
import { executeStrategyDeployment } from '../services/execution.service.js';

dotenv.config();

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

const geminiApiKey = process.env.GEMINI_API_KEY;
const FALLBACK_GEMINI_MODELS = [
    process.env.GEMINI_MODEL,
    'models/gemini-3-flash-preview',
    'models/gemini-2.5-flash',
    'models/gemini-2.5-pro',
    'models/gemini-2.0-flash'
].filter(Boolean);

const genAI = new GoogleGenerativeAI(geminiApiKey);
let activeGeminiModel = FALLBACK_GEMINI_MODELS[0] || null;

const getModel = (modelName = activeGeminiModel) => {
    if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY not set');
    }
    if (!modelName) {
        throw new Error('No Gemini model configured');
    }
    return genAI.getGenerativeModel({ model: modelName });
};

const tryGemini = async (executor) => {
    let lastError;

    for (const modelName of FALLBACK_GEMINI_MODELS) {
        activeGeminiModel = modelName;
        try {
            return await executor(getModel(modelName));
        } catch (error) {
            lastError = error;
            const message = String(error?.message || '').toLowerCase();
            const status = error?.status;

            const isModelNotFound = status === 404 || message.includes('not found') || message.includes('no longer available') || message.includes('is not found for api version');
            if (isModelNotFound) {
                console.warn(`[Gemini] model ${modelName} invalid, trying fallback.`, message);
                continue;
            }

            throw error;
        }
    }

    throw lastError;
};

export const generateGeminiText = async (prompt) => {
    if (!geminiApiKey || FALLBACK_GEMINI_MODELS.length === 0) {
        throw new Error('Gemini configuration unavailable');
    }

    return await tryGemini(async (model) => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    });
};

/**
 * Analyzes sentiment using FinBERT models via Hugging Face Inference API.
 * Tries multiple models as fallbacks to ensure reliability.
 */
export const getFinBERTSentiment = async (headlines) => {
    const hfToken = process.env.HF_API_TOKEN;
    if (!hfToken || !headlines.length) return null;

    const models = [
        "ProsusAI/finbert",
        "yiyanghkust/finbert-tone",
        "mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis"
    ];

    const text = headlines.join(". ");

    for (const model of models) {
        try {
            const response = await axios.post(
                `https://api-inference.huggingface.co/models/${model}`,
                { inputs: text, options: { wait_for_model: true } },
                { headers: { Authorization: `Bearer ${hfToken}` } }
            );

            const results = response.data;

            // Handle different output formats (some return nested arrays, others single)
            let scores = Array.isArray(results[0]) ? results[0] : results;

            if (scores && scores.length) {
                // Normalize labels as different models use slightly different names
                const getScore = (labelPart) => {
                    const found = scores.find(s => {
                        const l = s.label.toLowerCase();
                        if (labelPart === 'pos') return l.includes('pos') || l === 'label_2';
                        if (labelPart === 'neg') return l.includes('neg') || l === 'label_0';
                        return l.includes(labelPart.toLowerCase());
                    });
                    return found ? found.score : 0;
                };

                const pos = getScore('pos');
                const neg = getScore('neg');
                const score = pos - neg;
                console.log(`[Sentiment] Successfully used FinBERT model: ${model} | Score: ${score.toFixed(2)}`);
                return score;
            }
        } catch (error) {
            // Only log if it's the last one or not a 404
            if (error.response?.status !== 404) {
                console.warn(`[Sentiment] Model ${model} failed: ${error.message}`);
            }
            continue;
        }
    }

    return null;
};

export const getNewsSentiment = async (headlines) => {
    if (!headlines || headlines.length === 0) return 0;

    // 1. Try FinBERT first
    const finbertScore = await getFinBERTSentiment(headlines);
    if (finbertScore !== null) {
        console.log(`[Sentiment] Using FinBERT score: ${finbertScore.toFixed(2)}`);
        return finbertScore;
    }

    // 2. Fallback to Gemini
    try {
        const prompt = `
            Analyze the following news headlines related to a stock and provide a combined sentiment score between -1 and 1.
            -1 means extremely negative. 0 means neutral. 1 means extremely positive.
            Return ONLY the numerical score.
            
            Headlines:
            ${headlines.join('\n- ')}
        `;

        const text = await generateGeminiText(prompt);
        const score = parseFloat(text);
        return isNaN(score) ? 0 : score;
    } catch (error) {
        console.error("Gemini Sentiment Error:", error);
        return 0;
    }
};

export const getAIPredictionReasoning = async (symbol, indicators, sentiment, trendAnalysis) => {
    if (!process.env.GEMINI_API_KEY) return "Technical indicators show a trend based on market volume.";

    try {
        const systemInstruction = `
            Persona: Senior Institutional Equity Research Analyst.
            Objective: Provide a high-fidelity, quantitative verdict for ${symbol}.
            
            Mandate:
            - You have access to tools (get_stock_price, get_stock_fundamentals, get_stock_news_sentiment).
            - Use them if the provided context is insufficient or to verify live data.
            - Provide 5 concise points (Trend, Momentum, Flow/Sentiment, Risk-Reward, Verdict).
            - The **Verdict** point MUST be extremely direct (e.g., **AVOID / BUY / SELL**) and serve as the final executive summary.
            - Style: Bold key metrics. Decisive tone. Use Telegram-style conciseness.
            - Total response must be under 150 words.
        `;

        const context = `Analysis Context for ${symbol}: 
        Sentiment: ${sentiment}
        Indicators: ${JSON.stringify(indicators)}
        Trend Analysis: ${JSON.stringify(trendAnalysis)}`;

        const response = await runAgenticChat(
            [{ role: 'user', content: `Provide your institutional reasoning for the current ${symbol} analysis. ${context}` }],
            systemInstruction,
            'SYSTEM'
        );

        return response;
    } catch (error) {
        console.error("Agentic Reasoning Error:", error);
        return "Analysis suggests a potential move based on current institutional momentum.";
    }
};

export const getAIStrategy = async (prompt) => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

    const attempt = async () => {
        const text = await generateGeminiText(prompt);
        return text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
    };

    try {
        return await attempt();
    } catch (err) {
        const is429 = err?.message?.includes('429') || err?.status === 429;
        if (is429) {
            const match = err.message?.match(/retryDelay":"(\d+)s"/);
            const waitMs = Math.min((parseInt(match?.[1] || '10') + 2) * 1000, 32000);
            console.warn(`[Gemini] 429 – retrying after ${waitMs / 1000}s…`);
            await new Promise(r => setTimeout(r, waitMs));
            return await attempt();
        }
        throw err;
    }
};

/**
 * Extracts a stock symbol from a natural language query using Gemini AI.
 * @param {string} query - The user's search query (e.g. "Reliance industries", "Show me TCS price")
 * @returns {Promise<string|null>} - The extracted symbol (e.g. "RELIANCE.NS") or null
 */
export const extractStockSymbol = async (query) => {
    if (!process.env.GEMINI_API_KEY) return null;

    try {
        const prompt = `
            Your task is to identify a specific stock symbol based on the user's query.
            
            Query: "${query}"
            
            Guidelines:
            1. If the query mentions a specific company (e.g., "Reliance", "Tata Motors", "Apple"), find its primary trading symbol.
            2. If the query is descriptive (e.g., "biggest market cap stock in India", "largest tech company"), identify the relevant stock (e.g., RELIANCE.NS, AAPL).
            3. For Indian stocks, ALWAYS append the ".NS" suffix for NSE (e.g., TCS.NS, SBIN.NS).
            4. For US stocks, use the standard ticker (e.g., TSLA, MSFT).
            5. Return ONLY the symbol string. Do not include any explanation or punctuation.
            6. If you cannot identify a specific stock, return "NULL".
            
            Target Symbol:
        `;

        const text = await generateGeminiText(prompt);
        const symbol = text.trim().split(' ')[0].replace(/[^A-Za-z0-9.]/g, ''); // Clean any hallucinations

        if (!symbol || symbol.toUpperCase() === "NULL") return null;
        return symbol.toUpperCase();
    } catch (error) {
        console.error("Gemini Symbol Extraction Error:", error);
        return null;
    }
};

// --- AGENTIC RAG (FUNCTION CALLING) ADDITIONS ---

const agentTools = [
  {
    functionDeclarations: [
      {
        name: "get_stock_price",
        description: "Fetches live price, valuation (P/E), 52-week high/low, and moving averages for a stock.",
        parameters: {
          type: "OBJECT",
          properties: {
            symbol: { type: "STRING", description: "The stock symbol with exchange suffix (e.g., RELIANCE.NS, TSLA)" }
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_stock_fundamentals",
        description: "Fetches detailed financial ratios like Debt-to-Equity, ROE, and Dividend Yield.",
        parameters: {
          type: "OBJECT",
          properties: {
            symbol: { type: "STRING", description: "The stock symbol" }
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_stock_news_sentiment",
        description: "Fetches latest news headlines and a sentiment score (-1 to 1).",
        parameters: {
          type: "OBJECT",
          properties: {
             symbol: { type: "STRING", description: "The stock symbol" }
          },
          required: ["symbol"],
        }
      },
      {
        name: "deploy_investment_strategy",
        description: "Executes a multi-stock investment strategy for a specific amount. Only call this after user confirms the amount and mode.",
        parameters: {
          type: "OBJECT",
          properties: {
             amount: { type: "NUMBER", description: "The total amount to invest (e.g., 10000)" },
             mode: { type: "STRING", enum: ["mock", "live"], description: "The trading mode" }
          },
          required: ["amount", "mode"],
        }
      }
    ],
  },
];

const executeAgentTool = async (functionCall, userId) => {
    const { name, args } = functionCall;
    console.log(`[Agent] Executing tool: ${name} with args:`, args);

    if (name === "get_stock_price") {
        try {
            const quote = await yahooFinance.quote(args.symbol);
            return {
                symbol: args.symbol,
                price: quote.regularMarketPrice,
                currency: quote.currency,
                peRatio: quote.trailingPE || 'N/A',
                fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
                marketCap: quote.marketCap,
                volume: quote.regularMarketVolume,
                averageVolume: quote.averageDailyVolume10Day,
                twoHundredDayAverage: quote.twoHundredDayAverage,
                fiftyDayAverage: quote.fiftyDayAverage,
                priceToBook: quote.priceToBook
            };
        } catch (error) {
            return { error: `Failed to fetch price for ${args.symbol}: ${error.message}` };
        }
    }

    if (name === "get_stock_fundamentals") {
        try {
            const summary = await yahooFinance.quoteSummary(args.symbol, { 
                modules: ["financialData", "defaultKeyStatistics"] 
            });
            return {
                symbol: args.symbol,
                debtToEquity: summary.financialData?.debtToEquity,
                returnOnEquity: summary.financialData?.returnOnEquity,
                currentRatio: summary.financialData?.currentRatio,
                grossProfits: summary.financialData?.grossProfits,
                dividendYield: summary.defaultKeyStatistics?.dividendYield,
                beta: summary.defaultKeyStatistics?.beta
            };
        } catch (error) {
            return { error: `Failed to fetch fundamentals for ${args.symbol}: ${error.message}` };
        }
    }

    if (name === "get_stock_news_sentiment") {
        try {
            const news = await fetchStockNews(args.symbol);
            const headlines = news.slice(0, 5).map(n => n.title);
            const sentiment = await getNewsSentiment(headlines);
            return {
                symbol: args.symbol,
                sentimentScore: sentiment,
                sentimentInterpretation: sentiment > 0.3 ? 'Positive' : sentiment < -0.3 ? 'Negative' : 'Neutral',
                recentHeadlines: headlines
            };
        } catch (error) {
            return { error: `Failed to fetch news for ${args.symbol}: ${error.message}` };
        }
    }

    if (name === "deploy_investment_strategy") {
        try {
            if (!userId) throw new Error("Authentication required for deployment.");
            const result = await executeStrategyDeployment(userId, args.amount, args.mode);
            return result;
        } catch (error) {
            return { error: `Strategy deployment failed: ${error.message}` };
        }
    }

    return { error: "Unknown function" };
};

export const runAgenticChat = async (messages, systemInstruction, userId) => {
    if (!process.env.GEMINI_API_KEY || FALLBACK_GEMINI_MODELS.length === 0) {
        throw new Error('Gemini configuration unavailable');
    }

    const modelName = activeGeminiModel || FALLBACK_GEMINI_MODELS[0];
    console.log(`[Agentic Chat] Using model: ${modelName}`);
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        tools: agentTools
    });

    let history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    console.log(`[Agentic Chat] History length: ${history.length}`);
    
    // CRITICAL: Gemini history MUST start with a 'user' role. 
    // If the first message is from the assistant/model, we skip it for the history.
    if (history.length > 0 && history[0].role === 'model') {
        console.log('[Agentic Chat] Removing leading model message from history');
        history = history.slice(1);
    }

    const latestMessage = messages[messages.length - 1].content;
    console.log(`[Agentic Chat] Latest message: ${latestMessage}`);

    const chatSession = model.startChat({ history });

    let result = await chatSession.sendMessage(latestMessage);
    let response = await result.response;

    // Execution Loop for Function Calling (Handles multiple parallel tool calls)
    let functionCalls = response.functionCalls ? response.functionCalls() : [];
    
    while (functionCalls && functionCalls.length > 0) {
        const toolResponses = [];
        
        // Execute all requested tools in parallel
        for (const call of functionCalls) {
            const apiResponse = await executeAgentTool(call, userId);
            toolResponses.push({
                functionResponse: {
                    name: call.name,
                    response: apiResponse
                }
            });
        }

        // Send all tool results back to Gemini in one go
        result = await chatSession.sendMessage(toolResponses);
        response = await result.response;
        functionCalls = response.functionCalls ? response.functionCalls() : [];
    }

    const finalResponse = response.text().trim();
    console.log(`[Agentic Chat] Final Response length: ${finalResponse.length}`);
    return finalResponse;
};
