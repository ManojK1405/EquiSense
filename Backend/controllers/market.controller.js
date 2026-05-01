import YahooFinance from 'yahoo-finance2';
import { getMarketSummaryData } from '../services/market.service.js';
import { fetchMarketNews } from '../utils/news.js';

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

export const getMarketSummary = async (req, res) => {
    try {
        const data = await getMarketSummaryData();
        res.json(data);
    } catch (error) {
        console.error('Market Controller Error:', error);
        res.status(500).json({ error: 'Failed to fetch market summary', pulse: [], trending: [], topNews: [] });
    }
};

export const getMarketNews = async (req, res) => {
    try {
        const news = await fetchMarketNews();
        res.json(news);
    } catch (error) {
        console.error('Market News Controller Error:', error);
        res.status(500).json({ error: 'Failed to fetch market news' });
    }
};

export const searchSymbols = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    try {
        const results = await yahooFinance.search(q);
        const filtered = results.quotes
            .filter(item => 
                (item.quoteType === 'EQUITY' || item.quoteType === 'INDEX') && 
                (item.symbol.endsWith('.NS') || 
                 item.symbol.endsWith('.BO') || 
                 item.symbol.startsWith('^NSE') || 
                 item.symbol.startsWith('^BSESN'))
            )
            .map(item => ({
                symbol: item.symbol,
                name: item.shortname || item.longname || item.symbol,
                exch: item.exchDisp || item.exchange,
                type: item.quoteType
            }));
        res.json(filtered);
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};
