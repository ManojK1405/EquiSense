import axios from 'axios';
import https from 'https';

const ipv4Agent = new https.Agent({ family: 4 });

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Origin': 'https://finance.yahoo.com',
    'Referer': 'https://finance.yahoo.com/'
};

/**
 * Hardened Fetcher for Yahoo Finance Quotes
 * Mimics a browser and forces IPv4 to bypass cloud data-center blocks.
 */
export async function fetchSafeQuote(symbol) {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        const response = await axios.get(url, {
            httpsAgent: ipv4Agent,
            headers: COMMON_HEADERS,
            timeout: 8000
        });
        
        const result = response.data?.chart?.result?.[0]?.meta;
        if (!result) {
            console.warn(`[MarketFetcher] No quote data returned for ${symbol}`);
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
            longName: result.longName || result.shortName || symbol,
            marketState: result.marketState || 'REGULAR',
            symbol: result.symbol,
            currency: result.currency,
            exchangeName: result.exchangeName,
            fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: result.fiftyTwoWeekLow,
            regularMarketVolume: result.regularMarketVolume
        };
    } catch (err) {
        console.error(`[MarketFetcher] Quote failure for ${symbol}:`, err.message);
        return null;
    }
}

/**
 * Hardened Fetcher for Yahoo Finance Summary (Fundamentals)
 */
export async function fetchSafeSummary(symbol, modules = ['summaryProfile', 'financialData', 'defaultKeyStatistics', 'majorHoldersBreakdown']) {
    try {
        const modulesStr = modules.join(',');
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modulesStr}`;
        
        const response = await axios.get(url, {
            httpsAgent: ipv4Agent,
            headers: COMMON_HEADERS,
            timeout: 10000
        });

        const result = response.data?.quoteSummary?.result?.[0];
        if (!result) {
            console.warn(`[MarketFetcher] No summary data returned for ${symbol}`);
            return null;
        }

        // Helper to extract raw values from Yahoo's nested structure
        const extract = (obj) => {
            if (!obj) return {};
            const cleaned = {};
            for (const [key, val] of Object.entries(obj)) {
                if (val && typeof val === 'object' && 'raw' in val) {
                    cleaned[key] = val.raw;
                } else {
                    cleaned[key] = val;
                }
            }
            return cleaned;
        };

        return {
            summaryProfile: extract(result.summaryProfile),
            financialData: extract(result.financialData),
            defaultKeyStatistics: extract(result.defaultKeyStatistics),
            majorHoldersBreakdown: extract(result.majorHoldersBreakdown)
        };
    } catch (err) {
        console.error(`[MarketFetcher] Summary failure for ${symbol}:`, err.message);
        return null;
    }
}
