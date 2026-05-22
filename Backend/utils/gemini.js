import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import dotenv from 'dotenv';
import YahooFinance from 'yahoo-finance2';
import { fetchStockNews } from './news.js';
import { executeStrategyDeployment } from '../services/execution.service.js';
import { fetchSafeQuote, fetchSafeSummary } from './market-fetcher.js';

dotenv.config();

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

const geminiApiKey = process.env.GEMINI_API_KEY;
const FALLBACK_GEMINI_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest'
].filter(Boolean).map(m => m.startsWith('models/') ? m : `models/${m}`);

const genAI = new GoogleGenerativeAI(geminiApiKey);
let activeGeminiModel = FALLBACK_GEMINI_MODELS[0] || 'models/gemini-2.0-flash';

const tryGemini = async (executor) => {
    let lastError;
    const modelsToTry = [...FALLBACK_GEMINI_MODELS];
    
    for (const modelName of modelsToTry) {
        try {
            const result = await executor(genAI.getGenerativeModel({ model: modelName }));
            activeGeminiModel = modelName; // Save successful model
            return result;
        } catch (error) {
            lastError = error;
            const message = String(error?.message || '').toLowerCase();
            const status = error?.status;

            const isModelNotFound = status === 404 || message.includes('not found') || message.includes('no longer available') || message.includes('is not found for api version') || message.includes('unsupported model');
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

export const getAIStrategy = generateGeminiText; // Alias for backward compatibility

export const getAIPredictionReasoning = async (symbol, indicators, sentiment, trendAnalysis) => {
    const prompt = `
        Persona: Institutional Research Analyst.
        Objective: Provide a high-conviction quantitative reasoning for ${symbol}.
        
        Data points:
        - Indicators: ${JSON.stringify(indicators)}
        - Sentiment Score: ${sentiment}
        - Trend: ${trendAnalysis}
        
        Instruction: Synthesize this into a 2-sentence institutional-grade rationale. Focus on the convergence of technicals and sentiment.
    `;
    return await generateGeminiText(prompt);
};

export const extractStockSymbol = async (query) => {
    const prompt = `
        Persona: Financial Data Parser.
        Task: Extract the primary stock ticker symbol from this user query for the Indian market (NSE).
        Query: "${query}"
        
        Rule: Return ONLY the ticker symbol with .NS suffix (e.g., RELIANCE.NS). If no clear symbol, return "NONE".
    `;
    const response = await generateGeminiText(prompt);
    return response.trim().toUpperCase();
};

/**
 * Analyzes sentiment using FinBERT models via Hugging Face Inference API.
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
            let score = 0;

            if (Array.isArray(results[0])) {
                const labels = results[0];
                const pos = labels.find(l => l.label.toLowerCase().includes('pos'))?.score || 0;
                const neg = labels.find(l => l.label.toLowerCase().includes('neg'))?.score || 0;
                score = pos - neg;
            } else if (Array.isArray(results)) {
                const pos = results.find(l => l.label.toLowerCase().includes('pos'))?.score || 0;
                const neg = results.find(l => l.label.toLowerCase().includes('neg'))?.score || 0;
                score = pos - neg;
            }

            return score;
        } catch (error) {
            console.warn(`HF Model ${model} failed, trying fallback...`);
        }
    }
    return null;
};

/**
 * Enhanced news sentiment analysis using Gemini as a fallback/primary engine.
 */
export const getNewsSentiment = async (headlines) => {
    if (!headlines || headlines.length === 0) return 0;

    try {
        const finBERTScore = await getFinBERTSentiment(headlines);
        if (finBERTScore !== null) return finBERTScore;

        const prompt = `
            Persona: Expert Financial Analyst.
            Task: Analyze the sentiment of these stock market headlines and return a single precision floating point number between -1.0 (extremely bearish) and 1.0 (extremely bullish).
            
            Headlines:
            ${headlines.map((h, i) => `${i+1}. ${h}`).join('\n')}
            
            Rule: Return ONLY the number. No explanation.
        `;

        const response = await generateGeminiText(prompt);
        const score = parseFloat(response);
        return isNaN(score) ? 0 : score;
    } catch (error) {
        console.error('[Sentiment] Engine failure:', error.message);
        return 0;
    }
};

const agentTools = [
    {
        functionDeclarations: [
            {
                name: "get_stock_price",
                description: "Get current market price for a stock symbol (e.g., RELIANCE.NS)",
                parameters: {
                    type: "object",
                    properties: {
                        symbol: { type: "string", description: "The stock ticker symbol with .NS suffix for Indian stocks" }
                    },
                    required: ["symbol"]
                }
            },
            {
                name: "get_stock_fundamentals",
                description: "Get fundamental data (P/E, Market Cap, etc.) for a stock symbol",
                parameters: {
                    type: "object",
                    properties: {
                        symbol: { type: "string", description: "The stock ticker symbol" }
                    },
                    required: ["symbol"]
                }
            },
            {
                name: "get_stock_news_sentiment",
                description: "Get recent news headlines and sentiment score for a stock",
                parameters: {
                    type: "object",
                    properties: {
                        symbol: { type: "string", description: "The stock ticker symbol" }
                    },
                    required: ["symbol"]
                }
            },
            {
                name: "deploy_investment_strategy",
                description: "Execute and save a generated investment strategy to the user's portfolio vault",
                parameters: {
                    type: "object",
                    properties: {
                        amount: { type: "number", description: "Total capital to deploy" },
                        mode: { type: "string", enum: ["mock", "live"], description: "Deployment mode" }
                    },
                    required: ["amount", "mode"]
                }
            }
        ]
    }
];

const executeAgentTool = async (call, userId) => {
    const { name, args } = call;
    console.log(`[Agent] Executing tool: ${name} with args:`, args);

    if (name === "get_stock_price") {
        try {
            const quote = await fetchSafeQuote(args.symbol);
            if (!quote) throw new Error("Price data unavailable");
            return {
                symbol: args.symbol,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChangePercent,
                currency: quote.currency
            };
        } catch (error) {
            return { error: `Failed to fetch price for ${args.symbol}: ${error.message}` };
        }
    }

    if (name === "get_stock_fundamentals") {
        try {
            const summary = await fetchSafeSummary(args.symbol, ['defaultKeyStatistics', 'financialData']);
            if (!summary) throw new Error("Fundamental data unavailable");
            return {
                symbol: args.symbol,
                pe: summary.defaultKeyStatistics?.trailingPE || "N/A",
                marketCap: summary.defaultKeyStatistics?.marketCap || "N/A",
                currentPrice: summary.financialData?.currentPrice || "N/A"
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
    if (!geminiApiKey || FALLBACK_GEMINI_MODELS.length === 0) {
        throw new Error('Gemini configuration unavailable');
    }

    return await tryGemini(async (modelWithNoTools) => {
        const model = genAI.getGenerativeModel({
            model: modelWithNoTools.model,
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            tools: agentTools
        });

        let history = messages.slice(0, -1).map(m => {
            let role = 'user';
            if (m.role === 'assistant' || m.role === 'model') role = 'model';
            return { role, parts: [{ text: m.content }] };
        });

        if (history.length > 0 && history[0].role === 'model') {
            history = history.slice(1);
        }

        const sanitizedHistory = [];
        for (let i = 0; i < history.length; i++) {
            if (i === 0 || history[i].role !== history[i-1].role) {
                sanitizedHistory.push(history[i]);
            } else {
                sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += "\n\n" + history[i].parts[0].text;
            }
        }

        const latestMessage = messages[messages.length - 1].content;
        const chatSession = model.startChat({ history: sanitizedHistory });

        let result = await chatSession.sendMessage(latestMessage);
        let response = await result.response;

        let functionCalls = response.functionCalls ? response.functionCalls() : [];
        
        while (functionCalls && functionCalls.length > 0) {
            const toolResponses = [];
            for (const call of functionCalls) {
                const apiResponse = await executeAgentTool(call, userId);
                toolResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: apiResponse
                    }
                });
            }
            result = await chatSession.sendMessage(toolResponses);
            response = await result.response;
            functionCalls = response.functionCalls ? response.functionCalls() : [];
        }

        return response.text().trim();
    });
};
