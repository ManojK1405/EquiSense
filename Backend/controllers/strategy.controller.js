import YahooFinance from 'yahoo-finance2';
import { getAIStrategy, getNewsSentiment, generateGeminiText, runAgenticChat } from '../utils/gemini.js';
import { fetchStockNews } from '../utils/news.js';
import * as TI from 'technicalindicators';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const prisma = new PrismaClient();

dotenv.config();

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  validation: { logErrors: false }
});

// Cache for Intraday Pulse
const pulseCache = new Map();
const PULSE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function getDynamicSymbols(sector, count = 8) {
  const prompt = `
    Persona: Senior Quantitative Strategist.
    Objective: Identify exactly ${count} highly liquid, institutional-grade equity tickers for the Indian market (NSE) within the "${sector}" sector.
    
    Requirements:
    - Symbols must be valid for Yahoo Finance (e.g., RELIANCE.NS, INFV.NS).
    - Prioritize Large-cap and Mid-cap "Blue Chip" stocks with high daily volume.
    - Return ONLY a raw JSON array of strings. 
    - Output must be valid JSON: ["SYMBOL1.NS", "SYMBOL2.NS", ...]
  `;
  try {
    const raw = await getAIStrategy(prompt);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    throw new Error('Invalid JSON format');
  } catch (error) {
    console.error('[DynamicSymbols] Error fetching symbols. Falling back to dynamic broad market search.', error.message);
    throw new Error("Failed to dynamically resolve market symbols.");
  }
}

const NIFTY_INDICES = ['^NSEI', '^NSEBANK'];

import { fetchSafeQuote, fetchSafeSummary } from '../utils/market-fetcher.js';

async function fetchMomentum(symbol) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 35);

    // Chart is usually less restricted, but we still catch errors
    const chart = await yahooFinance.chart(symbol, {
      period1: startDate.toISOString().split('T')[0],
      interval: '1d',
    }).catch(() => null);

    let latestPrice;
    let oldestPrice;
    let quotes = [];

    if (chart?.quotes && chart.quotes.length >= 5) {
      quotes = chart.quotes.filter(q => q.close != null);
      latestPrice = quotes[quotes.length - 1].close;
      oldestPrice = quotes[0].close;
    } else {
      // Fallback: Use safe quote for current price if chart fails
      const q = await fetchSafeQuote(symbol);
      if (!q) return null;
      latestPrice = q.regularMarketPrice;
      oldestPrice = latestPrice; // Limited info
    }

    const returnPct = oldestPrice > 0 ? (((latestPrice - oldestPrice) / oldestPrice) * 100).toFixed(2) : 0;
    const avgVol = quotes.length > 0 ? (quotes.reduce((s, q) => s + (q.volume || 0), 0) / quotes.length) : 0;
    
    return { 
      symbol, 
      currentPrice: latestPrice, 
      returnPct: parseFloat(returnPct), 
      volumeTrend: 'Stable' 
    };
  } catch (err) {
    console.error(`[StrategyMomentum] Error for ${symbol}:`, err.message);
    return null;
  }
}

async function fetchQuoteSummary(symbol) {
  try {
    // Use hardened summary fetcher
    let summary = await fetchSafeSummary(symbol, ['summaryProfile', 'financialData', 'defaultKeyStatistics']);
    
    if (!summary) {
       // Fallback to library
       summary = await yahooFinance.quoteSummary(symbol, { 
         modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics'] 
       }).catch(() => null);
    }

    if (!summary) return null;

    const profile = summary.summaryProfile || {};
    const financials = summary.financialData || {};
    const stats = summary.defaultKeyStatistics || {};

    return {
      symbol,
      name: profile.longName || profile.shortName || symbol,
      price: financials.currentPrice || financials.regularMarketPrice || 0,
      pe: stats.trailingPE || stats.forwardPE || 0,
      marketCap: stats.marketCap || stats.enterpriseValue || 0,
    };
  } catch (err) {
    console.error(`[StrategySummary] Error for ${symbol}:`, err.message);
    return null;
  }
}

export const generateStrategy = async (req, res) => {
  const { amount, riskLevel, sector, horizon } = req.body;

  if (!amount || !riskLevel) {
    return res.status(400).json({ error: 'amount and riskLevel are required.' });
  }

  try {
    const systemInstruction = `
      Persona: Senior Quantitative Architect & CIO.
      Objective: Generate a comprehensive, institutional-grade investment blueprint for the Indian stock market (NSE).
      
      Mandate Details:
      - Commitment: ₹${amount}
      - Risk Profile: ${riskLevel}
      - Sector Focus: ${sector}
      - Time Horizon: ${horizon} Years
      
      CRITICAL INSTRUCTION: 
      - You MUST use your tools (get_stock_price, get_stock_fundamentals, get_stock_news_sentiment) to research 3-5 high-conviction assets.
      - BRANDING: NEVER use the word "Alpha" in the "strategyTitle" or "summary". Instead, use terms like "Growth Strategy", "Institutional Blueprint", "Wealth Engine", or "Quantitative Mandate".
      - Return ONLY a raw JSON object with this EXACT structure (no markdown code blocks):
      {
        "strategyTitle": "String (Short, punchy)",
        "summary": "String (2 sentences)",
        "projectedReturnRange": "String (e.g. 18-22%)",
        "riskScore": "String (Low/Medium/High)",
        "horizon": "String",
        "allocation": [
          {
            "name": "SYMBOL.NS",
            "displayName": "Company Name",
            "weight": Number (percentage),
            "amount": Number (rupees),
            "risk": "Low/Medium/High",
            "reason": "Short quantitative logic"
          }
        ],
        "marketOutlook": "String (1 paragraph analysis)",
        "executionGuidance": "String (Technical entry levels)"
      }
    `;    const response = await runAgenticChat([{ role: 'user', content: 'Generate my investment blueprint now.' }], systemInstruction, req.userId);
    
    // Improved JSON extraction: Find the first '{' and the last '}'
    const firstBrace = response.indexOf('{');
    const lastBrace = response.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
       throw new Error('AI failed to produce a valid strategy structure.');
    }

    const cleaned = response.substring(firstBrace, lastBrace + 1);
    res.json(JSON.parse(cleaned));
  } catch (error) {
    console.error('[Generate Strategy] Error:', error.message);
    res.status(500).json({ error: 'Failed to architect strategy. Market data service unavailable.' });
  }
};
export const generateIntradayPulse = async (req, res) => {
  const { sector } = req.body;
  try {
    const systemInstruction = `
      Persona: High-Frequency Quantitative Trader.
      Objective: Generate a 'Live Intraday Pulse' report for the ${sector || 'any'} sector.
      
      Mandate:
      - Use tools to find 5 high-momentum stocks for today.
      - Return a JSON report with exactly:
        "marketPulse": { "niftyReturn": Number, "bankNiftyReturn": Number, "generatedAt": "String" },
        "summary": "String",
        "picks": [
          {
            "symbol": "String",
            "name": "String",
            "currentPrice": Number,
            "return5": Number (5-minute change %),
            "sentiment": Number (-1 to 1),
            "sentimentHeadline": "String (e.g. Bullish Breakout)",
            "score": Number (0-100),
            "signal": "STRONG BUY / BUY / NEUTRAL / SELL",
            "currentRSI": Number,
            "volumeSpike": Number (ratio, e.g. 1.5 for 150%),
            "trend": "String (Uptrend/Downtrend)",
            "target": Number,
            "stopLoss": Number,
            "notes": ["String (Strategic Analysis)"]
          }
        ]
    `;

    const response = await runAgenticChat([{ role: 'user', content: 'Give me the intraday pulse now.' }], systemInstruction, req.userId);
    
    const firstBrace = response.indexOf('{');
    const lastBrace = response.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
       throw new Error('AI failed to produce a valid intraday report.');
    }

    const cleaned = response.substring(firstBrace, lastBrace + 1);
    res.json(JSON.parse(cleaned));
  } catch (error) {
    console.error('[Intraday Pulse] Error:', error.message);
    res.status(500).json({ error: 'Intraday engine failure.' });
  }
};
export const refreshIntradayPulseCache = async () => {
  console.log('[Agent] Skipping background refresh; switching to real-time agentic pulse.');
};

export const generateReverseStrategy = async (req, res) => {
  const { goalQuery, previousResult } = req.body;

  if (!goalQuery) {
    return res.status(400).json({ error: 'Goal query is required (e.g., "Buy a Ducati in 6 years").' });
  }

  console.log(`[Reverse Strategy] Goal: ${goalQuery}`);

  try {
    // 1. Resolve some high-liquidity symbols for the "Growth" part of the portfolio
    let symbols;
    try {
      symbols = await getDynamicSymbols('broad market', 10);
    } catch {
      symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS'];
    }

    // 2. Sample current momentum for realistic return expectations
    const momentumData = await Promise.all(symbols.map(fetchMomentum));
    const mktContext = momentumData
      .filter(Boolean)
      .map(d => `${d.symbol}|30d:${d.returnPct}%|Price:₹${d.currentPrice.toFixed(0)}`)
      .join('\n');

    // 3. Build previous-result context block if available
    const prevContext = previousResult
      ? `
      IMPORTANT — Previous Generation Context (Use this to correct errors and improve precision):
      - Previous Goal Title: "${previousResult.goalTitle}"
      - Previous Current Valuation: ₹${previousResult.currentValuation}
      - Previous Future Valuation: ₹${previousResult.futureValuation}
      - Previous Monthly SIP: ₹${previousResult.monthlySIP}
      - Previous Feasibility Score: ${previousResult.feasibilityScore}/100
      - Previous Allocation: ${JSON.stringify(previousResult.allocation)}
      - Previous Architect Advice: "${previousResult.architectAdvice}"
      
      Review the above for any errors (e.g. unrealistic SIP amounts, wrong tickers, illogical valuation jumps) and produce a corrected, more precise output this time.
      `
      : '';

    const prompt = `
      Persona: Senior Wealth Architect & Inflation Specialist.
      Objective: Blueprint a multi-year acquisition strategy for a specific luxury/life goal.
      
      User Intent: "${goalQuery}"
      Current Market Intelligence:
      ${mktContext}
      ${prevContext}
      
      Structural Requirements:
      1. Identification: Resolve the specific acquisition target and the client's timeline (in years).
      2. Valuation: Estimate the CURRENT market price of the goal in Indian Rupees (INR).
      3. Future Value (FV): Project the FUTURE cost by applying a conservative 4% annual baseline inflation rate AND a tactical 1.5% annual manufacturer price-hike factor (compounded annually). This totals a ~5.5% annual inflation expectation.
      4. Capital commitment: Calculate the required Monthly SIP (Systematic Investment Plan) needed to reach the FV, assuming a balanced 12.5% annual return on the portfolio.
      5. Execution mix: Provide a specific asset allocation involving the provided tickers (Growth), Debt (Stability), and Gold (Hedge).
      6. Mandatory Specificity: For Debt and Gold, NEVER use generic names (e.g., "Indian Debt Fund", "Gold ETF") in the "assets" string. You MUST provide actual, real Indian ETFs or Mutual Funds (e.g., "Nippon India ETF Gold BeES (GOLDBEES.NS)", "ICICI Prudential Liquid Fund", "SBI Magnum Gilt Fund").
      
      Output Format: Return ONLY valid JSON:
      {
        "goalTitle": "String (Do NOT use the word 'Alpha' in the title; use 'Growth Plan' or similar)",
        "timeframeYears": number,
        "currentValuation": number,
        "futureValuation": number,
        "monthlySIP": number,
        "allocation": [
           { "type": "Stock | Debt | Gold | Cash", "assets": "String of examples", "percentage": number, "logic": "Institutional rationale" }
        ],
        "assumedAnnualReturn": 12.5,
        "compoundedInflation": "8.5% total annual factor",
        "feasibilityScore": number (1-100),
        "architectAdvice": "Director-level advisory note"
      }
    `;

    const raw = await getAIStrategy(prompt);
    const parsed = JSON.parse(raw);

    // Final post-processing for precision
    const fullResult = {
      ...parsed,
      generatedAt: new Date().toISOString(),
      marketClarity: "Incorporated latest volatility clusters and inflation modeling."
    };

    res.json(fullResult);
  } catch (error) {
    console.error('[Reverse Strategy] Architectural Failure:', error.message);
    res.status(500).json({ error: 'Strategic blueprint failed. Please refine your goal query.' });
  }
};

export const saveStrategy = async (req, res) => {
  try {
    const { name, description, strategyData, isPublic } = req.body;
    const item = await prisma.savedStrategy.create({
      data: {
        user: { connect: { id: req.userId } },
        name: name || 'Untitled Strategy',
        description,
        data: strategyData,
        isPublic: isPublic || false
      }
    });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save strategy' });
  }
};

export const getSavedStrategies = async (req, res) => {
  try {
    const strategies = await prisma.savedStrategy.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(strategies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch saved strategies' });
  }
};

export const deleteStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.savedStrategy.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
};

export const updateStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, strategyData, isPublic } = req.body;
    const item = await prisma.savedStrategy.update({
      where: { id, userId: req.userId },
      data: { name, description, data: strategyData, isPublic }
    });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update strategy' });
  }
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let platformKB = '';
try {
    const kbPath = path.join(__dirname, '../data/platform_knowledge.md');
    platformKB = fs.readFileSync(kbPath, 'utf8');
} catch (e) {
    console.warn('[Chat] Knowledge base not found, proceeding without local context.');
}

export const chatStrategy = async (req, res) => {
  const { messages, context, mode } = req.body;
  if (!messages || !messages.length) {
    return res.status(400).json({ error: 'Messages are required.' });
  }

  try {
    let systemInstruction = '';
    
    if (mode === 'support') {
        systemInstruction = `
          Persona: EquiSense Platform Support & Financial Assistant.
          Objective: Assist users with platform-related questions and general financial queries.
          
          Knowledge Base (RAG Context):
          ${platformKB}
          
          Guidelines:
          - Use the Knowledge Base above to answer "How to", "About", and "What is" questions regarding EquiSense.
          - For general financial questions, provide accurate, professional, and simplified explanations.
          - If a user asks about a specific stock's current price or outlook, inform them that deep research is available in the "Dashboard" after logging in.
          - Tone: Friendly, helpful, and institutional.
          - BRANDING: NEVER use the word "Alpha".
        `;
    } else {
        systemInstruction = `
          Persona: Senior Quantitative Architect & CIO.
          Context: You are advising a high-net-worth client on the Indian stock market (NSE/BSE).
          
          CRITICAL INSTRUCTION: You have access to real-time tools.
          - BRANDING: NEVER use the word "Alpha" in your responses or strategy names. Use "Growth Strategy", "Mandate", or "Blueprint".
          - If the user asks a binary question like "Should I buy?", "Is this a sell?", or "Is it a good time to enter?", you MUST start your response with a clear, bold **EXECUTION VERDICT** based on the current analysis signal.
          - If the user asks about a specific stock's outlook, price, or potential, you MUST use your tools (get_stock_price, get_stock_fundamentals, get_stock_news_sentiment) to gather a complete data profile.
          - For every stock outlook request, you MUST produce a high-conviction "Micro Research Note" using this EXACT 5-section structure:
            1. **Trend & Structure**: Analyze price position relative to 50/200 DMAs, trend direction, and volume dynamics.
            2. **Momentum Validation**: Evaluate RSI regimes and momentum confirmation vs price action.
            3. **Fundamental Health**: Use get_stock_fundamentals to analyze Debt-to-Equity, ROE, and Dividend Yield. Mention valuation (P/E) relative to peers.
            4. **Sentiment & Narrative**: Summarize the current news cycle and sentiment score.
            5. **Investment Verdict**: Provide a clear stance (FAVORABLE / NEUTRAL / AVOID) for:
               (a) Swing Trading (1-4 weeks)
               (b) Medium-term (3-12 months)
               (c) Long-term Portfolio (1+ years)
          
          - ALWAYS append .NS to Indian stock symbols when calling tools.
          - STYLE: Institutional, decisive, and data-dense. Use "Telegram-style" conciseness for analysis.
          - MANDATORY: All capital allocation recommendations MUST be presented in a clean Markdown Table with the following columns: | Stock Symbol | Weight | Investment Amount | Current Price | RSI | Verdict |.
          - FORMAT:
            1. For direct "Should I buy/sell" questions: Start with **EXECUTION VERDICT: [ACTION]** followed by the Micro Research Note.
            2. For "Analyze [Stock]" or "Outlook for [Stock]", provide a 5-section Micro Research Note.
            3. For "Why" or "Comparison" (e.g., "Why M&M vs Tata?"), use a concise **Institutional Comparison** table or a 3-point bulleted summary.
            4. For "Invest [Amount]": Gather real-time data on 3-5 relevant stocks, propose a **REVISED BLUEPRINT TABLE**, and ASK for "CONFIRM MOCK" or "CONFIRM LIVE".
            5. If user says "Confirm [Mode]", call the 'deploy_investment_strategy' tool.
          - TONE: Senior Quantitative Strategist. Bold all key metrics (e.g., **₹30,000**, **RSI 42**).
        `;
    }

    // Inject strategy context if provided
    const history = context 
      ? [{ role: 'system', content: `CRITICAL CONTEXT: ${context}` }, ...messages]
      : messages;

    const response = await runAgenticChat(history, systemInstruction, req.userId);
    res.json({ role: 'assistant', content: response });
  } catch (error) {
    console.error('[Chat Strategy] Error:', error.message);
    res.status(500).json({ error: 'AI Strategist is temporarily unavailable.' });
  }
};

export const backtestStrategy = async (req, res) => {
  try {
    const { allocation, horizon, amount } = req.body;

    if (!allocation || !horizon || !amount) {
      return res.status(400).json({ error: 'Missing required parameters for backtest.' });
    }

    const startingCapital = parseFloat(amount);
    const lookbackYears = parseInt(horizon);
    const now = new Date();
    const startDate = new Date();
    startDate.setFullYear(now.getFullYear() - lookbackYears);

    const simulationResults = await Promise.all(allocation.map(async (asset) => {
      try {
        const symbol = asset.name;
        const weight = asset.weight / 100;
        const allocatedCapital = startingCapital * weight;

        // Fetch historical data
        const history = await yahooFinance.chart(symbol, {
          period1: startDate.toISOString().split('T')[0],
          interval: '1mo', // Monthly resolution for performance simulation
        }).catch(() => null);

        if (!history || !history.quotes || history.quotes.length === 0) {
          return { ...asset, startPrice: 0, endPrice: 0, growth: 1, listedRecently: true };
        }

        const quotes = history.quotes.filter(q => q.close != null);
        const startQuote = quotes[0];
        const endQuote = quotes[quotes.length - 1];

        const growth = endQuote.close / startQuote.close;
        const listingDate = new Date(startQuote.date);
        const isRecentListing = listingDate > startDate;

        return {
          ...asset,
          startPrice: startQuote.close,
          endPrice: endQuote.close,
          growth: growth,
          listingDate: startQuote.date,
          listedRecently: isRecentListing
        };
      } catch (err) {
        return { ...asset, growth: 1, error: true };
      }
    }));

    // Calculate Portfolio Final Value
    let totalFinalValue = 0;
    simulationResults.forEach(res => {
      const assetFinalValue = (startingCapital * (res.weight / 100)) * res.growth;
      totalFinalValue += assetFinalValue;
    });

    const totalReturn = ((totalFinalValue - startingCapital) / startingCapital) * 100;
    const cagr = (Math.pow(totalFinalValue / startingCapital, 1 / lookbackYears) - 1) * 100;

    // Use LLM only for qualitative analysis of these ACTUAL numbers
    const prompt = `
      Persona: Senior Quantitative Risk Manager.
      Task: Analyze the results of a ${lookbackYears}-year historical simulation.
      
      Actual Results:
      - Initial Investment: ₹${startingCapital.toLocaleString()}
      - Final Simulated Value: ₹${Math.round(totalFinalValue).toLocaleString()}
      - Calculated CAGR: ${cagr.toFixed(2)}%
      - Total Return: ${totalReturn.toFixed(2)}%
      
      Constituent Performance Details:
      ${simulationResults.map(r => `- ${r.displayName} (${r.name}): Growth x${r.growth.toFixed(2)} ${r.listedRecently ? `(LISTED RECENTLY: ${r.listingDate})` : ''}`).join('\n')}
      
      Requirement: 
      1. Provide a realistic, data-dense "analysis" (2-3 sentences). 
      2. If any stock was "LISTED RECENTLY" (e.g. OLAELEC), explicitly mention the survivor bias or the fact that capital was assumed to be in cash until the listing date.
      3. Be brutal about drawdowns for volatile stocks.
      
      Return ONLY a raw JSON object (no markdown):
      {
        "analysis": "String"
      }
    `;

    const aiAnalysisRaw = await getAIStrategy(prompt);
    const aiAnalysis = JSON.parse(aiAnalysisRaw.replace(/```json|```/g, '').trim());

    res.json({
      historicalValue: Math.round(totalFinalValue),
      historicalCAGR: `${cagr.toFixed(2)}%`,
      analysis: aiAnalysis.analysis,
      breakdown: simulationResults
    });
  } catch (error) {
    console.error('[Backtest Strategy] Error:', error.message);
    res.status(500).json({ error: 'Failed to simulate historical backtest.' });
  }
};

export const customBacktestStrategy = async (req, res) => {
  try {
    const { userInput, horizon, amount } = req.body;

    if (!userInput || !horizon || !amount) {
      return res.status(400).json({ error: 'Missing required parameters for custom backtest.' });
    }

    // Step 1: Parse User Input into Allocation using AI
    const parsePrompt = `
      Persona: Strategic Portfolio Architect.
      Task: Parse the following user investment strategy into a structured allocation.
      
      User Input: "${userInput}"
      
      Requirements:
      1. Identify the stocks mentioned. Assume NSE/BSE (e.g. RELIANCE.NS).
      2. Assign realistic weights based on the user's intent. If not specified, distribute equally.
      3. Return ONLY a raw JSON array of objects: [{ "name": "TICKER.NS", "weight": 50, "displayName": "Company Name" }]. 
      4. Ensure weights sum to exactly 100.
    `;

    const rawParse = await getAIStrategy(parsePrompt);
    const allocation = JSON.parse(rawParse.replace(/```json|```/g, '').trim());

    // Step 2: Run actual data-driven backtest
    const startingCapital = parseFloat(amount);
    const lookbackYears = parseInt(horizon);
    const now = new Date();
    const startDate = new Date();
    startDate.setFullYear(now.getFullYear() - lookbackYears);

    const simulationResults = await Promise.all(allocation.map(async (asset) => {
      try {
        const history = await yahooFinance.chart(asset.name, {
          period1: startDate.toISOString().split('T')[0],
          interval: '1mo',
        }).catch(() => null);

        if (!history || !history.quotes || history.quotes.length === 0) {
          return { ...asset, growth: 1, listedRecently: true };
        }

        const quotes = history.quotes.filter(q => q.close != null);
        const startQuote = quotes[0];
        const endQuote = quotes[quotes.length - 1];
        const growth = endQuote.close / startQuote.close;
        const listingDate = new Date(startQuote.date);

        return {
          ...asset,
          growth: growth,
          listingDate: startQuote.date,
          listedRecently: listingDate > startDate
        };
      } catch (err) {
        return { ...asset, growth: 1, error: true };
      }
    }));

    let totalFinalValue = 0;
    simulationResults.forEach(res => {
      totalFinalValue += (startingCapital * (res.weight / 100)) * res.growth;
    });

    const totalReturn = ((totalFinalValue - startingCapital) / startingCapital) * 100;
    const cagr = (Math.pow(totalFinalValue / startingCapital, 1 / lookbackYears) - 1) * 100;

    // Step 3: Qualitative AI Analysis
    const analysisPrompt = `
      Persona: Senior Quantitative Risk Manager.
      Task: Analyze this custom portfolio's ${lookbackYears}-year performance.
      
      Results:
      - Initial: ₹${startingCapital.toLocaleString()}
      - Final: ₹${Math.round(totalFinalValue).toLocaleString()}
      - CAGR: ${cagr.toFixed(2)}%
      
      Constituents:
      ${simulationResults.map(r => `- ${r.displayName} (${r.name}): Growth x${r.growth.toFixed(2)} ${r.listedRecently ? `(LISTED: ${r.listingDate})` : ''}`).join('\n')}
      
      Requirement: Provide a 2-3 sentence "analysis" focusing on risk and drawdowns.
      Return ONLY a raw JSON object: { "analysis": "..." }
    `;

    const aiAnalysisRaw = await getAIStrategy(analysisPrompt);
    const aiAnalysis = JSON.parse(aiAnalysisRaw.replace(/```json|```/g, '').trim());

    res.json({
      parsedAllocation: allocation,
      historicalValue: Math.round(totalFinalValue),
      historicalCAGR: `${cagr.toFixed(2)}%`,
      analysis: aiAnalysis.analysis,
      breakdown: simulationResults
    });
  } catch (error) {
    console.error('[Custom Backtest] Error:', error.message);
    res.status(500).json({ error: 'Failed to run custom strategy backtest.' });
  }
};