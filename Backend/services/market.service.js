import YahooFinance from 'yahoo-finance2';
import { fetchStockNews } from '../utils/news.js';

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

// Cache for market summary to reduce API overhead
let cachedMarketData = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

export const getMarketSummaryData = async () => {
    // Return cached data if valid
    const now = Date.now();
    if (cachedMarketData && (now - lastCacheUpdate < CACHE_DURATION)) {
        console.log('[MarketService] Serving from institutional cache');
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
        const quotes = await Promise.all(sectors.map(s => 
            yahooFinance.quote(s.symbol).catch(err => {
                console.warn(`[Market] Quote failed for ${s.symbol}:`, err.message);
                return null;
            })
        ));

        pulse = sectors.map((s, i) => {
            const q = quotes[i];
            return {
                name: s.name,
                symbol: s.symbol,
                price: q?.regularMarketPrice || 0,
                change: q?.regularMarketChange || 0,
                changePercent: q?.regularMarketChangePercent || 0,
                state: q?.marketState || 'CLOSED'
            };
        });
    } catch (e) {
        console.error('[Market] Pulse failed:', e);
    }

    let trending = [];
    try {
        const trendingResp = await yahooFinance.trendingSymbols('IN').catch(() => ({ quotes: [] }));
        const trendingSymbols = trendingResp.quotes?.length > 0 
            ? trendingResp.quotes.slice(0, 10).map(q => q.symbol) 
            : ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'SBIN.NS'];

        const trendingQuotes = await Promise.all(
            trendingSymbols.map(sym => yahooFinance.quote(sym).catch(() => null))
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
        const newsSymbol = trending.length > 0 ? trending[0].symbol : 'RELIANCE.NS';
        const newsName = trending.length > 0 ? trending[0].name : 'Reliance Industries';
        const rawNews = await fetchStockNews(newsSymbol, newsName, 'Market');
        
        const financialKeywords = [
            'stock', 'market', 'share', 'profit', 'earnings', 'revenue', 'invest', 'finance', 
            'economic', 'trade', 'nifty', 'sensex', 'fed', 'rbi', 'yield', 'dividend', 
            'ipo', 'portfolio', 'asset', 'bank', 'capital', 'index', 'nasdaq', 'bull', 'bear'
        ];

        topNews = rawNews.filter(n => {
            const text = (n.title + ' ' + (n.description || '')).toLowerCase();
            return financialKeywords.some(kw => text.includes(kw));
        }).slice(0, 5).map(n => ({
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
