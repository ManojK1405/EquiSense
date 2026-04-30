import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const fetchStockNews = async (symbol, name, sector) => {
    const apiKey = process.env.NEWS_API_KEY;
    const cleanSymbol = symbol.split('.')[0];
    const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO');
    
    // Define common synonyms for major Indian stocks to improve matching
    const synonyms = {
        'SBIN': 'SBI',
        'RELIANCE': 'Reliance',
        'TCS': 'Tata Consultancy',
        'HDFCBANK': 'HDFC Bank',
        'INFY': 'Infosys'
    },
    extraTerm = synonyms[cleanSymbol] || '';

    // NewsAPI Circuit Breaker (Static tracker)
    if (!global.newsApiBackoff) global.newsApiBackoff = 0;
    const isBackoffActive = Date.now() < global.newsApiBackoff;

    // 1. Fetch from NewsAPI (Everything endpoint)
    const newsApiArticles = [];
    if (apiKey && !isBackoffActive) {
        try {
            const marketContext = isIndian ? ' (India OR NSE OR BSE)' : '';
            const query = `("${name}"${extraTerm ? ` OR "${extraTerm}"` : ''} OR "${cleanSymbol}") AND (stock OR shares OR profit OR earnings OR market)${marketContext}`;
            
            const resp = await axios.get(`https://newsapi.org/v2/everything`, {
                params: {
                    q: query,
                    searchIn: 'title,description',
                    sortBy: 'relevancy',
                    language: 'en',
                    pageSize: 20,
                    apiKey: apiKey
                }
            });
            newsApiArticles.push(...(resp.data.articles || []));
        } catch (e) {
            if (e.response?.status === 429) {
                console.warn("[NewsAPI] Rate limit reached (429). Silencing for 15 minutes.");
                global.newsApiBackoff = Date.now() + 15 * 60 * 1000;
            } else {
                console.error("NewsAPI Error:", e.message);
            }
        }

        // 1b. Fetch General Market News from NewsAPI
        if (Date.now() > global.newsApiBackoff) {
            try {
                const marketQuery = `(Nifty 50 OR Sensex OR "Indian stock market" OR "RBI" OR "NSE India") AND (stock OR market OR economy)`;
                const marketResp = await axios.get(`https://newsapi.org/v2/everything`, {
                    params: {
                        q: marketQuery,
                        searchIn: 'title,description',
                        sortBy: 'publishedAt',
                        language: 'en',
                        pageSize: 8,
                        apiKey: apiKey
                    }
                });
                const marketArticles = (marketResp.data.articles || []).map(a => ({ ...a, isMarketNews: true }));
                newsApiArticles.push(...marketArticles);
            } catch (e) {
                if (e.response?.status === 429) {
                    global.newsApiBackoff = Date.now() + 15 * 60 * 1000;
                } else {
                    console.error("Market NewsAPI Error:", e.message);
                }
            }
        }
    } else if (isBackoffActive) {
        // Silently skip or log once
    }

    // 2. Fetch from Yahoo Finance (Search endpoint)
    const yahooArticles = [];
    try {
        const YahooFinance = (await import('yahoo-finance2')).default;
        const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'], validation: { logErrors: false } });
        const yfResult = await yf.search(symbol);
        if (yfResult.news) {
            yahooArticles.push(...yfResult.news);
        }
    } catch (e) {
        console.error("Yahoo News Error:", e.message);
    }

    // 3. Map both to a unified format
    const unified = [
        ...newsApiArticles.map(a => ({
            title: a.title,
            description: a.description,
            url: a.url,
            source: a.source.name,
            publishedAt: a.publishedAt,
            isMarketNews: !!a.isMarketNews
        })),
        ...yahooArticles.map(a => ({
            title: a.title,
            description: '',
            url: a.link,
            source: a.publisher || 'Yahoo Finance',
            publishedAt: a.providerPublishTime ? new Date(a.providerPublishTime * 1000).toISOString() : new Date().toISOString()
        }))
    ];

    // 4. Filter & Deduplicate
    const seenTitles = new Set();
    const final = unified.filter(art => {
        if (!art.title || art.title.length < 5) return false;
        
        const lowTitle = art.title.toLowerCase();
        const partialTitle = lowTitle.substring(0, 40);
        if (seenTitles.has(partialTitle)) return false;
        seenTitles.add(partialTitle);

        if (art.isMarketNews) return true;

        const n = name.toLowerCase();
        const s = cleanSymbol.toLowerCase();
        const e = extraTerm.toLowerCase();
        
        // Broaden relevance to catch more headlines
        const isStockRelevant = 
            lowTitle.includes(n) || 
            lowTitle.includes(s) || 
            (e && lowTitle.includes(e)) || 
            (sector && lowTitle.includes(sector.toLowerCase())) ||
            lowTitle.split(' ').some(word => word.toUpperCase() === cleanSymbol.toUpperCase());
        
        return isStockRelevant;
    });

    console.log(`[News] Found ${final.length} relevant articles for ${symbol} (out of ${unified.length} total)`);
    return final.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 15);
};
