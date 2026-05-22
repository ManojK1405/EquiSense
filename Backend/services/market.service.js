import { fetchSafeQuote } from '../utils/market-fetcher.js';
import { fetchStockNews, fetchMarketNews } from '../utils/news.js';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

// Cache for market summary to reduce API overhead
let cachedMarketData = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const getMarketSummaryData = async () => {
    // Return cached data if valid
    const now = Date.now();
    if (cachedMarketData && (now - lastCacheUpdate < CACHE_DURATION)) {
        return cachedMarketData;
    }

    const sectors = [
        { name: 'Nifty 50', symbol: '^NSEI' },
        { name: 'Bank Nifty', symbol: '^NSEBANK' },
        { name: 'Nifty IT', symbol: '^CNXIT' },
        { name: 'BSE Sensex', symbol: '^BSESN' }
    ];

    const fallbackTrendingSymbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'BHARTIARTL.NS', 'ITC.NS', 'SBIN.NS', 'LICI.NS', 'HINDUNILVR.NS'];

    const sectorSymbols = [
        { name: 'Auto', sym: '^CNXAUTO' },
        { name: 'IT', sym: '^CNXIT' },
        { name: 'Metals', sym: '^CNXMETAL' },
        { name: 'Pharma', sym: '^CNXPHARMA' },
        { name: 'Energy', sym: '^CNXENERGY' },
        { name: 'FMCG', sym: '^CNXFMCG' }
    ];

    const globalSymbols = [
        { name: 'Nasdaq', sym: '^IXIC' },
        { name: 'S&P 500', sym: '^GSPC' },
        { name: 'DAX', sym: '^GDAXI' },
        { name: 'Nikkei', sym: '^N225' },
        { name: 'FTSE 100', sym: '^FTSE' }
    ];

    // Resolve trending symbols first
    let trendingSymbols = [];
    try {
        const trendingResp = await yahooFinance.trendingSymbols('IN', { count: 10 }, { validateResult: false });
        trendingSymbols = trendingResp.quotes?.map(q => q.symbol) || [];
    } catch (err) {
        console.warn('[MarketService] Trending API failed, using hardcoded fallbacks');
    }
    if (trendingSymbols.length === 0) {
        trendingSymbols = fallbackTrendingSymbols;
    }

    // Build full symbol list and attempt one batch fetch
    const allSymbols = Array.from(new Set([
        ...sectors.map(s => s.symbol),
        ...trendingSymbols,
        ...sectorSymbols.map(s => s.sym),
        ...globalSymbols.map(s => s.sym)
    ]));

    // quotesMap: symbol → raw quote object from batch fetch
    const quotesMap = {};
    try {
        console.log(`[MarketService] Batch fetch for ${allSymbols.length} symbols...`);
        const batchQuotes = await yahooFinance.quote(allSymbols);
        if (batchQuotes && Array.isArray(batchQuotes)) {
            for (const q of batchQuotes) {
                if (q && q.symbol) quotesMap[q.symbol] = q;
            }
            console.log(`[MarketService] Batch fetch succeeded: ${Object.keys(quotesMap).length} symbols`);
        }
    } catch (err) {
        console.warn('[MarketService] Batch fetch failed, falling back to individual fetchSafeQuote:', err.message);
    }

    // Helper: get from quotesMap or fall back to fetchSafeQuote (which has its own 4-tier fallback)
    const getQuote = async (symbol) => {
        const q = quotesMap[symbol];
        if (q && q.regularMarketPrice > 0) {
            return {
                regularMarketPrice: q.regularMarketPrice,
                regularMarketChange: q.regularMarketChange,
                regularMarketChangePercent: q.regularMarketChangePercent,
                shortName: q.shortName || q.longName || symbol,
                longName: q.longName || q.shortName || symbol,
                marketState: q.marketState || 'REGULAR',
                symbol: symbol
            };
        }
        return await fetchSafeQuote(symbol);
    };

    // 1. Pulse (Indian indices)
    let pulse = [];
    try {
        const quotes = await Promise.all(sectors.map(s => getQuote(s.symbol)));
        pulse = sectors.map((s, i) => {
            const q = quotes[i];
            return {
                name: s.name,
                symbol: s.symbol,
                price: q?.regularMarketPrice || 0,
                change: q?.regularMarketChange || 0,
                changePercent: q?.regularMarketChangePercent || 0,
                state: q?.marketState || 'OPEN'
            };
        });
    } catch (e) {
        console.error('[Market] Pulse failed:', e);
    }

    // 2. Trending stocks
    let trending = [];
    try {
        const trendingQuotes = await Promise.all(
            trendingSymbols.slice(0, 10).map(sym => getQuote(sym))
        );
        trending = trendingQuotes.filter(q => q).map(q => ({
            symbol: q.symbol,
            name: q.shortName || q.longName || q.symbol.replace('.NS', ''),
            price: q.regularMarketPrice || 0,
            change: q.regularMarketChange || 0,
            changePercent: q.regularMarketChangePercent || 0,
        })).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    } catch (e) {
        console.error('[Market] Trending failed:', e);
    }

    // 3. Top news
    let topNews = [];
    try {
        const rawNews = await fetchMarketNews();
        topNews = rawNews.slice(0, 5).map(n => ({
            title: n.title,
            link: n.url,
            publisher: n.source,
            content: n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : 'Recent'
        }));
    } catch (e) {
        console.error('[Market] News failed:', e);
    }

    // 4. Sector gainers
    let sectorGainers = [];
    try {
        const sectorQuotes = await Promise.all(
            sectorSymbols.map(s => getQuote(s.sym))
        );
        sectorGainers = sectorSymbols.map((s, i) => ({
            name: s.name,
            changePercent: sectorQuotes[i]?.regularMarketChangePercent || 0
        })).sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
    } catch (e) {
        console.error('[Market] Sectors failed:', e);
    }

    // 5. Global indices
    let globalIndices = [];
    try {
        const globalQuotes = await Promise.all(
            globalSymbols.map(s => getQuote(s.sym))
        );
        globalIndices = globalSymbols.map((s, i) => ({
            name: s.name,
            changePercent: globalQuotes[i]?.regularMarketChangePercent || 0
        })).slice(0, 3);
    } catch (e) {
        console.error('[Market] Globals failed:', e);
    }

    cachedMarketData = { pulse, trending, topNews, sectorGainers, globalIndices };
    lastCacheUpdate = Date.now();
    return cachedMarketData;
};
