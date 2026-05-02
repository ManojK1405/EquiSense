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
const CACHE_DURATION = 10 * 60 * 1000; // Reduced to 10 minutes for better live feel

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

    let pulse = [];
    try {
        const quotes = await Promise.all(sectors.map(s => fetchSafeQuote(s.symbol)));

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
        
        // If all prices are 0, it means we likely have a connectivity/IPv6 issue with Yahoo
        if (pulse.every(p => p.price === 0)) {
            console.error('[MarketService] CRITICAL: All market indices returned 0. Possible API block or network issue.');
        }
    } catch (e) {
        console.error('[Market] Pulse failed:', e);
    }

    let trending = [];
    try {
        // Fallback trending symbols if the API fails
        const fallbackSymbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'BHARTIARTL.NS', 'ITC.NS', 'SBIN.NS', 'LICI.NS', 'HINDUNILVR.NS'];
        
        let trendingSymbols = [];
        try {
            const trendingResp = await yahooFinance.trendingSymbols('IN', { count: 10 });
            trendingSymbols = trendingResp.quotes?.map(q => q.symbol) || [];
        } catch (err) {
            console.warn('[MarketService] Trending API failed, using fallbacks');
        }

        if (trendingSymbols.length === 0) {
            trendingSymbols = fallbackSymbols;
        }

        const trendingQuotes = await Promise.all(
            trendingSymbols.slice(0, 10).map(sym => fetchSafeQuote(sym))
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

    let sectorGainers = [];
    try {
        const sectorSymbols = [
            { name: 'Auto', sym: '^CNXAUTO' },
            { name: 'IT', sym: '^CNXIT' },
            { name: 'Metals', sym: '^CNXMETAL' },
            { name: 'Pharma', sym: '^CNXPHARMA' },
            { name: 'Energy', sym: '^CNXENERGY' },
            { name: 'FMCG', sym: '^CNXFMCG' }
        ];
        const sectorQuotes = await Promise.all(
            sectorSymbols.map(s => yahooFinance.quote(s.sym).catch(() => null))
        );
        sectorGainers = sectorSymbols.map((s, i) => ({
            name: s.name,
            changePercent: sectorQuotes[i]?.regularMarketChangePercent || 0
        })).sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
    } catch (e) {
        console.error('[Market] Sectors failed:', e);
    }

    let globalIndices = [];
    try {
        const globalSymbols = [
            { name: 'Nasdaq', sym: '^IXIC' },
            { name: 'S&P 500', sym: '^GSPC' },
            { name: 'DAX', sym: '^GDAXI' },
            { name: 'Nikkei', sym: '^N225' },
            { name: 'FTSE 100', sym: '^FTSE' }
        ];
        const globalQuotes = await Promise.all(
            globalSymbols.map(s => yahooFinance.quote(s.sym).catch(() => null))
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
