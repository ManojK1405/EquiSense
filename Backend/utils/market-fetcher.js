import axios from 'axios';
import https from 'https';

const ipv4Agent = new https.Agent({ family: 4 });

/**
 * Hardened Fetcher for Yahoo Finance
 * Mimics a browser and forces IPv4 to bypass cloud data-center blocks.
 */
export async function fetchSafeQuote(symbol) {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        const response = await axios.get(url, {
            httpsAgent: ipv4Agent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Origin': 'https://finance.yahoo.com',
                'Referer': 'https://finance.yahoo.com/'
            },
            timeout: 8000
        });
        
        const result = response.data?.chart?.result?.[0]?.meta;
        if (!result) {
            console.warn(`[MarketFetcher] No data returned for ${symbol}`);
            return null;
        }

        const price = result.regularMarketPrice;
        const prevClose = result.chartPreviousClose || price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        
        return {
            regularMarketPrice: price,
            regularMarketChange: change,
            regularMarketChangePercent: changePercent,
            shortName: result.shortName || result.longName || symbol,
            marketState: result.marketState || 'REGULAR',
            symbol: result.symbol
        };
    } catch (err) {
        console.error(`[MarketFetcher] Critical failure for ${symbol}:`, err.message);
        return null;
    }
}
