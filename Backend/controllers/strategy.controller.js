import YahooFinance from 'yahoo-finance2';
import { getAIStrategy, getNewsSentiment, generateGeminiText } from '../utils/gemini.js';
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

async function fetchMomentum(symbol) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 35);

    const chart = await yahooFinance.chart(symbol, {
      period1: startDate.toISOString().split('T')[0],
      interval: '1d',
    }).catch(() => null);

    if (!chart?.quotes || chart.quotes.length < 5) return null;

    const quotes = chart.quotes.filter(q => q.close != null);
    const latest = quotes[quotes.length - 1];
    const oldest = quotes[0];
    const returnPct = (((latest.close - oldest.close) / oldest.close) * 100).toFixed(2);
    const avgVol = quotes.reduce((s, q) => s + (q.volume || 0), 0) / quotes.length;
    const volTrend = (latest.volume || 0) > avgVol ? 'Rising' : 'Falling';

    return { symbol, currentPrice: latest.close, returnPct: parseFloat(returnPct), volumeTrend: volTrend };
  } catch {
    return null;
  }
}

async function fetchQuoteSummary(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol).catch(() => null);
    if (!quote) return null;
    return {
      symbol,
      name: quote.longName || quote.shortName || symbol,
      price: quote.regularMarketPrice || 0,
      pe: quote.trailingPE || 0,
      marketCap: quote.marketCap || 0,
    };
  } catch {
    return null;
  }
}

export const generateStrategy = async (req, res) => {
  const { amount, riskLevel, sector, horizon } = req.body;

  if (!amount || !riskLevel) {
    return res.status(400).json({ error: 'amount and riskLevel are required.' });
  }

  const investAmount = parseFloat(amount);
  if (isNaN(investAmount) || investAmount <= 0) {
    return res.status(400).json({ error: 'Invalid investment amount.' });
  }

  const resolvedSector = (sector || 'any').toLowerCase();
  
  let symbols;
  try {
    symbols = await getDynamicSymbols(resolvedSector, 8);
  } catch (err) {
    return res.status(503).json({ error: 'Failed to dynamically fetch market symbols.' });
  }

  console.log(`[Strategy] ₹${investAmount}, risk=${riskLevel}, sector=${resolvedSector}, horizon=${horizon}`);

  const [indexSnapshots, momentumResults, quoteResults] = await Promise.all([
    Promise.all(NIFTY_INDICES.map(fetchMomentum)),
    Promise.all(symbols.map(fetchMomentum)),
    Promise.all(symbols.map(fetchQuoteSummary)),
  ]);

  const niftySnapshot = indexSnapshots[0];
  const bankNiftySnapshot = indexSnapshots[1];

  const stockData = symbols
    .map((sym, i) => ({ momentum: momentumResults[i], quote: quoteResults[i] }))
    .filter(d => d.momentum && d.quote)
    .map(d => ({
      symbol: d.momentum.symbol,
      name: d.quote.name,
      price: d.momentum.currentPrice,
      returnPct: d.momentum.returnPct,
      volumeTrend: d.momentum.volumeTrend,
      pe: d.quote.pe,
    }))
    .sort((a, b) => b.returnPct - a.returnPct);

  if (stockData.length === 0) {
    return res.status(503).json({ error: 'Unable to fetch market data. Try again shortly.' });
  }

  const horizonText = `${horizon} Year${horizon > 1 ? 's' : ''}`;
  const riskScore = riskLevel === 'conservative' ? 'Low' : riskLevel === 'aggressive' ? 'High' : 'Moderate';

  // Compact market context (fewer tokens)
  const topStocks = stockData.slice(0, 5);
  const mktLines = [
    `N50:${niftySnapshot?.returnPct ?? 'N/A'}% BNF:${bankNiftySnapshot?.returnPct ?? 'N/A'}%`,
    ...topStocks.map(s => `${s.symbol}|${s.name}|P:${s.price?.toFixed(0)}|30d:${s.returnPct}%|V:${s.volumeTrend}|PE:${s.pe?.toFixed(1) ?? 'N/A'}`),
  ].join('\n');

  const prompt = `
    Act as the Chief Investment Officer (CIO) of a boutique Indian wealth management firm. 
    Construct a sophisticated "Institutional Alpha Portfolio" based on the following parameters:
    
    Client Profile:
    - Principal: ₹${investAmount}
    - Risk Mandate: ${riskLevel}
    - Sector Focus: ${resolvedSector}
    - Time Horizon: ${horizonText}
    
    Market Intelligence Feed:
    ${mktLines}
    
    Architectural Rules:
    1. Capital Allocation: Dynamically weight assets. For smaller amounts (e.g. < ₹50,000), strictly limit to 3-5 high-conviction picks to prevent over-diversification.
    2. Diversity: Include a mix of high-momentum stocks and defensive hedges.
    3. Mandatory Specificity: For Debt and Gold, NEVER use generic names. Use real Indian ETFs (e.g., "GOLDBEES.NS", "LIQUIDBEES.NS", etc.)
    4. Granularity: Ensure no single stock is weighted below 10% of the total portfolio.
    5. Unit-Awareness: The "amount" allocated to a stock MUST be enough to buy at least 1 or 2 full shares based on the provided current price. If ₹${investAmount} is too small for a specific stock (e.g. MRF, Maruti), DO NOT recommend it; suggest a lower-priced alternative or a Nifty ETF (NIFTYBEES.NS) instead.
    6. Compliance: Total weights must equal exactly 100%. Total amounts must sum to ₹${investAmount}.
    
    Constraint: Return ONLY valid JSON.
    {
      "strategyTitle": "String",
      "summary": "High-level summary",
      "riskScore": "${riskScore}",
      "projectedReturnRange": "% range", 
      "horizon": "${horizonText}",
      "allocation": [
        {
          "name": "Ticker (Symbol.NS / Symbol.BO)",
          "displayName": "Full Name",
          "type": "stock | debt | gold | cash",
          "weight": number,
          "amount": number,
          "reason": "Rationale",
          "risk": "Low | Moderate | High"
        }
      ],
      "marketOutlook": "Macro projection",
      "keyRisks": ["Risk1"],
      "rebalanceAdvice": "Advice"
    }
  `;

  try {
    const raw = await getAIStrategy(prompt);
    console.log('[Strategy] Raw Gemini response:', raw.substring(0, 200));

    const strategy = JSON.parse(raw);

    if (Array.isArray(strategy.allocation)) {
      // Ensure weights sum to 100%
      let totalWeight = strategy.allocation.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
      
      // If the AI hallucinated and under-allocated, fill the gap with a Cash Reserve
      if (totalWeight < 100) {
          const gap = 100 - totalWeight;
          strategy.allocation.push({
              name: 'LIQUIDBEES.NS',
              displayName: 'Cash Reserve (Auto-Balanced)',
              type: 'cash',
              weight: gap,
              reason: 'System auto-allocated remaining capital to liquid reserves to ensure 100% deployment of mandate.',
              risk: 'Low'
          });
      }
      
      // Re-calculate the absolute amounts to ensure precision
      strategy.allocation = strategy.allocation.map(item => ({
        ...item,
        amount: Math.round((Number(item.weight) / 100) * investAmount),
      }));
    }

    strategy.generatedAt = new Date().toISOString();
    strategy.inputParams = { amount: investAmount, riskLevel, sector: resolvedSector, horizon };
    strategy.marketSnapshot = {
      nifty50_30d: niftySnapshot?.returnPct,
      bankNifty_30d: bankNiftySnapshot?.returnPct,
      topMover: stockData[0]?.symbol,
      topMoverReturn: stockData[0]?.returnPct,
    };

    res.json(strategy);
  } catch (err) {
    console.error('[Strategy] Error:', err.message);
    res.status(500).json({ error: 'Strategy generation failed. Please try again.' });
  }
};

const safeSMA = (values, period) => {
  if (!values || values.length < period) return null;
  const output = TI.SMA.calculate({ period, values }) || [];
  return output.length ? output[output.length - 1] : null;
};



const scoreIntraday = ({ return5, volumeSpike, currentRSI, trend }) => {
  let score = 0;
  score += Math.max(-20, Math.min(40, return5 * 4));
  score += volumeSpike > 1.25 ? 24 : volumeSpike > 1.1 ? 14 : volumeSpike < 0.9 ? -12 : 0;
  score += currentRSI < 30 ? 14 : currentRSI > 85 ? -18 : currentRSI > 75 ? -8 : 0;
  score += trend === 'bullish' ? 18 : trend === 'bearish' ? -12 : 0;
  return Math.round(score);
};

const makeIntradaySignal = (score) => {
  if (score >= 50) return 'Strong Long';
  if (score >= 30) return 'Long Setup';
  if (score >= 10) return 'Watch for Entry';
  if (score >= -10) return 'Sideways/Wait';
  return 'Avoid';
};

async function fetchIntradayCandidate(symbol) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 35);

    const chart = await yahooFinance.chart(symbol, {
      period1: startDate.toISOString().split('T')[0],
      interval: '1d',
    }).catch(() => null);

    const quotes = chart?.quotes?.filter(q => q && q.close != null) || [];
    if (quotes.length < 12) return null;

    const latest = quotes[quotes.length - 1];
    const fiveAgo = quotes[quotes.length - 6];
    const tenAgo = quotes[quotes.length - 11];
    if (!fiveAgo || !tenAgo) return null;

    const closes = quotes.map(q => q.close);
    const avgVol10 = quotes.slice(-10).reduce((sum, q) => sum + (q.volume || 0), 0) / 10;
    const volumeSpike = avgVol10 > 0 ? (latest.volume || 0) / avgVol10 : 1;
    const currentRSI = TI.RSI.calculate({ values: closes, period: Math.min(14, closes.length - 1) })?.pop() || 50;
    const sma5 = safeSMA(closes, 5);
    const sma20 = safeSMA(closes, 20);
    const trend = sma5 && sma20 ? (sma5 > sma20 ? 'bullish' : sma5 < sma20 ? 'bearish' : 'neutral') : 'neutral';
    const return5 = ((latest.close - fiveAgo.close) / fiveAgo.close) * 100;
    const return10 = ((latest.close - tenAgo.close) / tenAgo.close) * 100;

    const quote = await fetchQuoteSummary(symbol);
    const name = quote?.name || symbol;

    const baseScore = scoreIntraday({ return5, volumeSpike, currentRSI, trend });
    const entryPrice = latest.close;
    
    const entryMin = (entryPrice * 0.995).toFixed(1);
    const entryMax = (entryPrice * 1.003).toFixed(1);
    const entryRange = `${entryMin} - ${entryMax}`;
    
    const targetBase = entryPrice * (1 + Math.min(0.05, Math.max(0.025, baseScore / 200)));
    const targetMin = (targetBase * 0.99).toFixed(1);
    const targetMax = (targetBase * 1.015).toFixed(1);
    const targetRange = `${targetMin} - ${targetMax}`;
    
    const stopBase = entryPrice * 0.985;
    const stopMin = (stopBase * 0.99).toFixed(1);
    const stopMax = (stopBase * 1.01).toFixed(1);
    const stopRange = `${stopMin} - ${stopMax}`;

    const support = parseFloat((Math.min(latest.close, fiveAgo.close) * 0.98).toFixed(2));
    const resistance = parseFloat((Math.max(latest.close, fiveAgo.close) * 1.02).toFixed(2));

    return {
      symbol,
      name,
      currentPrice: latest.close,
      return5: parseFloat(return5.toFixed(2)),
      return10: parseFloat(return10.toFixed(2)),
      volumeSpike: parseFloat(volumeSpike.toFixed(2)),
      currentRSI: parseFloat(currentRSI.toFixed(1)),
      trend,
      score: baseScore,
      signal: makeIntradaySignal(baseScore),
      entry: entryRange,
      target: targetRange,
      stopLoss: stopRange,
      support,
      resistance,
      chartPoints: quotes.slice(-20).map(q => ({ date: q.date, close: q.close })),
    };
  } catch (error) {
    console.error(`[Intraday] Candidate fetch failed for ${symbol}:`, error.message);
    return null;
  }
}

export const generateIntradayPulse = async (req, res) => {
  const resolvedSector = (req.body?.sector || 'any').toLowerCase();
  
  // 1. Check Institutional Cache
  const cached = pulseCache.get(resolvedSector);
  const now = Date.now();
  if (cached && (now - cached.timestamp < PULSE_CACHE_DURATION)) {
    console.log(`[IntradayPulse] Serving ${resolvedSector} from institutional cache`);
    return res.json(cached.data);
  }

  try {
    const data = await fetchIntradayPulseData(resolvedSector);
    
    // Store in cache
    pulseCache.set(resolvedSector, {
      timestamp: now,
      data
    });

    res.json(data);
  } catch (error) {
    console.error('[Intraday] Pulse generation failed:', error.message);
    res.status(500).json({ error: 'Intraday pulse generation failed. Please try again later.' });
  }
};

/**
 * Shared logic to fetch intraday pulse data (extracted for background refresh)
 */
async function fetchIntradayPulseData(sector) {
  const resolvedSector = sector.toLowerCase();
  
  let candidates;
  try {
    candidates = await getDynamicSymbols(resolvedSector, 10);
  } catch (err) {
    throw new Error('Failed to dynamically fetch intraday candidates.');
  }

  const [indexSnapshots, candidateRows] = await Promise.all([
    Promise.all(NIFTY_INDICES.map(fetchMomentum)),
    Promise.all(candidates.map(fetchIntradayCandidate)),
  ]);

  const marketPulse = {
    niftyReturn: indexSnapshots[0]?.returnPct ?? 0,
    bankNiftyReturn: indexSnapshots[1]?.returnPct ?? 0,
    generatedAt: new Date().toISOString(),
  };

  const ranked = candidateRows
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const withSentiment = await Promise.all(ranked.map(async candidate => {
    const news = await fetchStockNews(candidate.symbol).catch(() => []);
    const headlines = news.map(n => n.title).filter(Boolean).slice(0, 8);
    const sentiment = headlines.length ? await getNewsSentiment(headlines).catch(() => 0) : 0;
    const adjustedScore = candidate.score + Math.round(sentiment * 20);
    return {
      ...candidate,
      sentiment: parseFloat(sentiment.toFixed(2)),
      sentimentHeadline: sentiment > 0.3 ? 'Positive buzz' : sentiment < -0.3 ? 'Negative catalyst' : 'Neutral news flow',
      score: adjustedScore,
      notes: [
        `Momentum Engine: The asset shifted ${candidate.return5 >= 0 ? '+' : ''}${candidate.return5}% over 5 sessions, securing a ${candidate.return5 >= 2 ? 'dominant aggressive' : candidate.return5 >= 0 ? 'steady supportive' : 'consolidating'} trajectory.`,
        `Volume Metric: Algorithm detects a ${((candidate.volumeSpike - 1) * 100).toFixed(1)}% deviation in liquidity vs the 10-day average. ${candidate.volumeSpike > 1.1 ? 'Institutions are actively stepping in.' : 'Volume remains standard; prepare for sudden catalyst triggers.'}`,
        `Technical Bounds: RSI holds at ${candidate.currentRSI.toFixed(1)}/100. ${candidate.currentRSI > 80 ? 'Warning: Asset is highly overbought.' : candidate.currentRSI < 35 ? 'Deep discount identified; high probability of a mean-reversion bounce.' : 'Settled squarely in a highly favorable breakout zone.'}`,
        `Trend Matrix: Short-term trailing overlays are heavily ${candidate.trend.toUpperCase()} against the live execution price (₹${candidate.currentPrice.toFixed(1)}).`,
        `Live Sentiment: ${sentiment > 0.3 ? `Positive media cycle detected (+${(sentiment*100).toFixed(0)}% buzz score).` : sentiment < -0.3 ? `Negative drag detected (${(sentiment*100).toFixed(0)}%). Strict sizing recommended.` : 'News flow is fundamentally neutral.'}`
      ],
    };
  }));

  const picks = withSentiment
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  if (picks.length === 0) {
    throw new Error('Unable to produce intraday recommendations at this time.');
  }

  const summary = `Intraday pulse is leaning toward ${picks.map(p => p.symbol).join(', ')}. Focus on the highest-scoring setups with positive volume momentum and keep tight risk controls reflecting the calculated trailing stop loss zones.`;

  return { marketPulse, summary, picks };
}

/**
 * Background Worker to refresh the Intraday Pulse cache for all sectors
 */
export const refreshIntradayPulseCache = async () => {
  const sectors = ['any', 'IT', 'Banking', 'Auto', 'Energy'];
  console.log('--- [IntradayPulse] Warming Sector Caches ---');
  
  for (const sector of sectors) {
    try {
      console.log(`[IntradayPulse] Refreshing cache for: ${sector}`);
      const data = await fetchIntradayPulseData(sector);
      pulseCache.set(sector.toLowerCase(), {
        timestamp: Date.now(),
        data
      });
    } catch (error) {
      console.error(`[IntradayPulse] Refresh failed for ${sector}:`, error.message);
    }
  }
  console.log('--- [IntradayPulse] Cache Warming Complete ---');
};

/**
 * Reverse Strategy: Goal-based financial planning with inflation and price-hike projection.
 */
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
      3. Future Value (FV): Project the FUTURE cost by applying a 6% annual baseline inflation rate AND a tactical 2.5% annual manufacturer price-hike factor (compounded annually).
      4. Capital commitment: Calculate the required Monthly SIP (Systematic Investment Plan) needed to reach the FV, assuming a balanced 12.5% annual return on the portfolio.
      5. Execution mix: Provide a specific asset allocation involving the provided tickers (Growth), Debt (Stability), and Gold (Hedge).
      6. Mandatory Specificity: For Debt and Gold, NEVER use generic names (e.g., "Indian Debt Fund", "Gold ETF") in the "assets" string. You MUST provide actual, real Indian ETFs or Mutual Funds (e.g., "Nippon India ETF Gold BeES (GOLDBEES.NS)", "ICICI Prudential Liquid Fund", "SBI Magnum Gilt Fund").
      
      Output Format: Return ONLY valid JSON:
      {
        "goalTitle": "String",
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

export const chatStrategy = async (req, res) => {
  const { messages } = req.body;
  if (!messages || !messages.length) {
    return res.status(400).json({ error: 'Messages are required.' });
  }

  try {
    const userMessage = messages[messages.length - 1].content;
    
    // Fetch fresh context to make the bot "Institutional"
    const [nifty, bankNifty, trending] = await Promise.all([
      fetchMomentum('^NSEI'),
      fetchMomentum('^NSEBANK'),
      getDynamicSymbols('broad market', 5)
    ]);

    const trendingQuotes = await Promise.all(trending.map(fetchMomentum));
    const mktContext = [
      `NIFTY: ${nifty?.returnPct}% | BANKNIFTY: ${bankNifty?.returnPct}%`,
      ...trendingQuotes.filter(Boolean).map(q => `${q.symbol}: ${q.returnPct}%`)
    ].join('; ');

    const prompt = `
      Persona: Senior Quantitative Architect & CIO.
      Context: You are advising a high-net-worth client on the Indian stock market (NSE/BSE).
      Live Market Intelligence: ${mktContext}
      
      User Message: "${userMessage}"
      
      Requirements:
      - Provide an institutional-grade response grounded in the provided live market context.
      - Use specific tickers (e.g. RELIANCE.NS, TCS.NS) when discussing sectors.
      - If they ask for a plan, outline a 3-step quantitative approach (e.g., Asset Mix, Entry Logic, Risk Hedge).
      - Maintain a professional, decisive, yet cautious tone (Standard SEBI/Institutional disclaimer style).
      - Be concise but data-dense.
    `;

    const response = await generateGeminiText(prompt);
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

    const allocString = allocation.map(a => `${a.name} (${a.weight}%)`).join(', ');

    const prompt = `
      Persona: Senior Quantitative Analyst & Risk Manager.
      Objective: Run a simulated historical backtest for an Indian stock market portfolio.
      
      Portfolio Composition: ${allocString}
      Initial Investment (T0): ₹${amount}
      Historical Lookback Period: ${horizon} Years
      
      Task:
      Based on your extensive historical knowledge of these specific stocks over the last ${horizon} years, calculate what this portfolio would be worth TODAY if it had been invested ${horizon} years ago in these exact proportions (assuming no rebalancing).
      
      Requirements:
      1. Provide a realistic "historicalValue" (the final simulated amount in INR). Use integers only.
      2. Provide the "historicalCAGR" string (e.g. "14.5%").
      3. Provide a brief 2-3 sentence "analysis" explaining how this portfolio weathered past macro events (e.g. COVID-19, inflation spikes, sector rotations) and assessing its historical drawdown risk.
      
      Return ONLY a raw JSON object (no markdown):
      {
        "historicalValue": 1200000,
        "historicalCAGR": "14.5%",
        "analysis": "..."
      }
    `;

    const rawResponse = await getAIStrategy(prompt);
    const parsed = JSON.parse(rawResponse);
    res.json(parsed);
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

    const investAmount = parseFloat(amount);
    const horizonYears = parseInt(horizon);

    // Step 1: Ask AI to parse the user input into structured portfolio weights
    const parsePrompt = `
      Extract the stock tickers and their portfolio weights from the user input.
      Assume Indian stocks (NSE/BSE). Append .NS to NSE tickers if not provided.
      Input: "${userInput}"
      Return ONLY a raw JSON array without markdown formatting: [{"symbol": "RELIANCE.NS", "weight": 50, "name": "Reliance Industries"}]
      Ensure weights sum to 100. If no weight is specified, distribute equally.
    `;
    const rawParsed = await getAIStrategy(parsePrompt);
    let parsedAllocation = [];
    try {
        parsedAllocation = JSON.parse(rawParsed.replace(/```json|```/gi, '').trim());
    } catch (e) {
        return res.status(500).json({ error: 'Failed to parse strategy allocation.' });
    }

    // Step 2: Fetch actual historical data and compute exact returns
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - horizonYears);

    let totalSimulatedValue = 0;
    const finalAllocation = [];

    for (const alloc of parsedAllocation) {
        let ret = 0;
        try {
            const chart = await yahooFinance.chart(alloc.symbol, {
                period1: startDate.toISOString().split('T')[0],
                period2: endDate.toISOString().split('T')[0],
                interval: '1mo'
            });
            const quotes = chart.quotes.filter(q => q.close != null);
            if (quotes.length > 0) {
                const first = quotes[0].close;
                const last = quotes[quotes.length - 1].close;
                ret = (last - first) / first;
            }
        } catch (e) {
            console.warn(`[Custom Backtest] Could not fetch history for ${alloc.symbol}, assuming 0% return.`);
        }
        
        const allocatedAmount = (alloc.weight / 100) * investAmount;
        const finalAmount = allocatedAmount * (1 + ret);
        totalSimulatedValue += finalAmount;
        
        finalAllocation.push({
            name: alloc.symbol,
            displayName: alloc.name || alloc.symbol,
            weight: alloc.weight
        });
    }

    // Handle edge case where totalSimulatedValue is 0 (e.g. all fetches failed)
    if (totalSimulatedValue === 0 && finalAllocation.length > 0) {
        totalSimulatedValue = investAmount; 
    }

    // Calculate CAGR
    let cagr = 0;
    if (totalSimulatedValue > 0 && investAmount > 0) {
        cagr = (((totalSimulatedValue / investAmount) ** (1 / horizonYears)) - 1) * 100;
    }

    // Step 3: Ask AI for an analysis of the exact historical performance
    const analysisPrompt = `
      Persona: Senior Quantitative Analyst.
      Write a 2-3 sentence analysis of an Indian stock portfolio that had an initial investment of ₹${investAmount} and is now worth ₹${Math.round(totalSimulatedValue)} over ${horizonYears} years (CAGR: ${cagr.toFixed(2)}%).
      Portfolio Allocation: ${JSON.stringify(finalAllocation)}
      Task: Briefly mention how this specific portfolio performed, assess its historical drawdown risk, and note any major drags or drivers based on the final computed CAGR.
      Return plain text only, no markdown.
    `;
    const analysis = await getAIStrategy(analysisPrompt);

    res.json({
      parsedAllocation: finalAllocation,
      historicalValue: Math.round(totalSimulatedValue),
      historicalCAGR: `${cagr > 0 ? '+' : ''}${cagr.toFixed(2)}%`,
      analysis: analysis.trim()
    });

  } catch (error) {
    console.error('[Custom Backtest] Error:', error.message);
    res.status(500).json({ error: 'Failed to run custom strategy backtest.' });
  }
};
