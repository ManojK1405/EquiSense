import YahooFinance from 'yahoo-finance2';
import { analyzeStock } from '../utils/analysis.js';
import { fetchStockNews } from '../utils/news.js';
import { getNewsSentiment, getAIPredictionReasoning } from '../utils/gemini.js';
import { fetchSafeQuote, fetchSafeSummary } from '../utils/market-fetcher.js';

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

export const getStockPrediction = async (req, res) => {
  let { symbol } = req.params;
  
  // Dynamically resolve symbol using Yahoo Finance search
  if (!symbol.toUpperCase().endsWith('.NS') && !symbol.toUpperCase().endsWith('.BO')) {
      try {
          const searchResult = await yahooFinance.search(symbol);
          if (searchResult && searchResult.quotes && searchResult.quotes.length > 0) {
              const exactMatch = searchResult.quotes.find(q => 
                  q.symbol === `${symbol.toUpperCase()}.NS` || 
                  q.symbol === `${symbol.toUpperCase()}.BO`
              );
              const anyIndianStock = searchResult.quotes.find(q => 
                  q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')
              );
              
              symbol = exactMatch?.symbol || anyIndianStock?.symbol || `${symbol.toUpperCase()}.NS`;
          } else {
              symbol = `${symbol.toUpperCase()}.NS`;
          }
      } catch (err) {
          console.error("Symbol search error:", err.message);
          symbol = `${symbol.toUpperCase()}.NS`;
      }
  } else {
      symbol = symbol.toUpperCase();
  }

  console.log(`--- Fetching Fresh Analysis for: ${symbol} ---`);

  try {
    // 1. Fetch Company Metadata & Institutional Quote (Hardened for Production)
    console.log(`Fetching quote for ${symbol}...`);
    let quote = await fetchSafeQuote(symbol);
    
    // Fallback to library if safe fetcher fails
    if (!quote) {
      console.warn(`[Prediction] Safe quote failed for ${symbol}, falling back to library.`);
      quote = await yahooFinance.quote(symbol).catch(err => {
         console.error("Yahoo Quote Error:", err.message);
         return null;
      });
    }

    const companyName = quote?.longName || quote?.shortName || symbol;
    const sector = quote?.sector || quote?.industry || null;

    // 1b. Fetch Extended Company Profile & Financials (Hardened for Production)
    console.log(`Fetching summary for ${symbol}...`);
    let summaryResult = await fetchSafeSummary(symbol);
    
    // Fallback to library
    if (!summaryResult) {
      console.warn(`[Prediction] Safe summary failed for ${symbol}, falling back to library.`);
      summaryResult = await yahooFinance.quoteSummary(symbol, { 
        modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics', 'majorHoldersBreakdown'] 
      }).catch(err => {
         console.error("Yahoo Summary Error:", err.message);
         return null;
      });
    }

    const profile = summaryResult?.summaryProfile || {};
    const financials = summaryResult?.financialData || {};
    const stats = summaryResult?.defaultKeyStatistics || {};
    const holdings = summaryResult?.majorHoldersBreakdown || {};

    // 2. Fetch Historical Data (2 years for better chart zooming)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 730);

    console.log(`Fetching chart data for ${symbol}...`);
    const chartResult = await yahooFinance.chart(symbol, {
      period1: startDate.toISOString().split('T')[0],
      interval: '1d'
    }).catch(err => {
      console.error("Yahoo Chart Error:", err.message);
      return null;
    });

    const result = chartResult?.quotes?.map(q => ({
       date: q.date,
       open: q.open,
       high: q.high,
       low: q.low,
       close: q.close,
       volume: q.volume
    })) || [];

    if (!result || result.length < 5) {
      return res.status(404).json({ error: 'Not enough historical data found for analysis.' });
    }

    // 3. Fetch Precise News & Sentiment (Sector-aware)
    console.log(`Fetching targeted news for ${companyName} (${sector || 'General'})...`);
    const news = await fetchStockNews(symbol, companyName, sector).catch(err => {
      console.error("News Fetch Error:", err.message);
      return [];
    });
    
    const headlines = news.map(n => n.title);
    const sentiment = headlines.length > 0 ? await getNewsSentiment(headlines).catch(err => {
       console.error("Sentiment Error:", err.message);
       return 0;
    }) : 0;

    // 3. Perform Deterministic Analysis
    console.log(`Performing technical analysis...`);
    const analysis = analyzeStock(result, sentiment);
    analysis.symbol = symbol;
    analysis.chartData = result;
    analysis.news = news;

    // 4. Get AI Reasoning for the signals
    console.log(`Getting Gemini reasoning...`);
    const aiReasoningStr = await getAIPredictionReasoning(symbol, analysis.indicators, sentiment, analysis.trendAnalysis).catch(err => {
       console.error("Gemini Reasoning Error:", err.message);
       return "Market analysis suggests following current trends.";
    });
    
    const aiReasoningList = aiReasoningStr.split('\n').filter(r => r.trim()).map(r => r.replace(/^[*-]\s*/, ''));
    analysis.reasoning = [...new Set([...analysis.reasoning, ...aiReasoningList])];

    if (quote) {
      analysis.currentPrice = quote.regularMarketPrice || analysis.currentPrice;
      analysis.name = companyName;
      analysis.sector = sector;
      analysis.fundamentals = {
        marketCap: quote.marketCap || 0,
        peRatio: quote.trailingPE || quote.forwardPE || 0,
        dividendYield: quote.dividendYield || 0,
        beta: quote.beta || 0,
        eps: quote.trailingEps || 0,
        marketState: quote.marketState || 'N/A',
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
        regularMarketVolume: quote.regularMarketVolume || 0,
        regularMarketOpen: quote.regularMarketOpen || 0,
        regularMarketChangePercent: quote.regularMarketChangePercent || 0,
        exchange: quote.exchange || quote.fullExchangeName || ''
      };
    } else {
      analysis.fundamentals = { marketCap: 0, peRatio: 0, dividendYield: 0, beta: 0, eps: 0, marketState: 'N/A', fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0, regularMarketVolume: 0, regularMarketOpen: 0, regularMarketChangePercent: 0 };
    }

    // 4. Assemble final structured response with high-fidelity fallbacks
    const finalResult = {
      ...analysis,
      profile: {
        description: profile.longBusinessSummary || "Institutional description pending.",
        sector: profile.sector || "N/A",
        industry: profile.industry || "N/A",
        website: profile.website || "N/A",
        employees: profile.fullTimeEmployees || "N/A",
        city: profile.city || "N/A"
      },
      fundamentals: {
        marketCap: quote?.marketCap || stats.marketCap || stats.enterpriseValue || 0,
        peRatio: quote?.trailingPE || quote?.forwardPE || stats.trailingPE || stats.forwardPE || 0,
        dividendYield: quote?.dividendYield || stats.dividendYield || financials.dividendYield || 0,
        beta: quote?.beta || stats.beta || 0,
        eps: quote?.trailingEps || stats.trailingEps || stats.forwardEps || 0,
        marketState: quote?.marketState || 'N/A',
        fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh || stats.fiftyTwoWeekHigh || 0,
        fiftyTwoWeekLow: quote?.fiftyTwoWeekLow || stats.fiftyTwoWeekLow || 0,
        regularMarketVolume: quote?.regularMarketVolume || financials.volume || 0,
        regularMarketOpen: quote?.regularMarketOpen || 0,
        regularMarketChangePercent: quote?.regularMarketChangePercent || 0,
        roe: financials.returnOnEquity || 0,
        roa: stats.returnOnAssets || 0,
        currentRatio: financials.currentRatio || 0,
        debtToEquity: financials.debtToEquity || 0,
        revenueGrowth: financials.revenueGrowth || 0,
        profitMargins: financials.profitMargins || 0,
        bookValue: stats.bookValue || 0,
        priceToBook: stats.priceToBook || 0,
        totalRevenue: financials.totalRevenue || 0,
        netIncome: financials.netIncomeToCommon || financials.netIncome || 0,
        ebitda: financials.ebitda || 0,
        operatingMargins: financials.operatingMargins || 0,
        insiderHolding: holdings.insidersPercent || 0,
        institutionsHolding: holdings.institutionsPercent || 0,
        institutionsCount: holdings.institutionsCount || 0
      }
    };

    console.log(`Analysis complete for ${symbol}.`);
    res.json(finalResult);

  } catch (error) {
    console.error(`Prediction Controller Error for ${symbol}:`, error);
    res.status(500).json({ error: 'Failed to generate prediction. Please try again later.' });
  }
};
