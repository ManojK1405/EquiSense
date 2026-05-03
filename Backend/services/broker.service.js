import axios from 'axios';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

export const executeLiveTrade = async (user, symbol, quantity, action) => {
    const { brokerType } = user;
    const brokerApiKey = user[`${brokerType}ApiKey`];
    const brokerApiSecret = user[`${brokerType}ApiSecret`];
    const brokerAccess = user[`${brokerType}AccessToken`];
    
    if (!brokerApiKey || !brokerAccess) {
        throw new Error('Broker credentials missing for live execution.');
    }

    const symbolOnly = symbol.split('.')[0];
    let orderResponse;

    try {
        if (brokerType === 'zerodha') {
            // Zerodha uses brokerAccess as the full "apiKey:accessToken" or just accessToken depending on implementation
            // In our syncBroker, we store it as authenticatedAccessToken
            orderResponse = await axios.post('https://api.kite.trade/orders/regular', {
                tradingsymbol: symbolOnly,
                exchange: symbol.endsWith('.BO') ? 'BSE' : 'NSE',
                transaction_type: action, // BUY or SELL
                order_type: 'MARKET',
                quantity: quantity,
                product: 'CNC',
                validity: 'DAY'
            }, {
                headers: {
                    'X-Kite-Version': '3',
                    'Authorization': `token ${brokerAccess}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
        } else if (brokerType === 'groww') {
            orderResponse = await axios.post('https://api.groww.in/v1/trade/orders', {
                symbol: symbol,
                qty: quantity,
                side: action,
                type: 'MARKET'
            }, {
                headers: {
                    'X-API-Key': brokerApiKey,
                    'X-API-Secret': brokerApiSecret,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            throw new Error(`Unsupported broker: ${brokerType}`);
        }

        return {
            success: true,
            orderId: brokerType === 'zerodha' ? orderResponse.data?.data?.order_id : orderResponse.data?.order_id,
            brokerResponse: orderResponse.data
        };
    } catch (err) {
        console.error(`Live Trade Failed (${symbol}):`, err.response?.data || err.message);
        return {
            success: false,
            error: err.response?.data?.message || err.message
        };
    }
};

export const processTradesImmediately = async (apiKey, apiSecret, brokerType, trades) => {
    const orderResults = [];
    for (const trade of trades) {
        if (!trade.symbol) continue;
        
        let price = trade.price;
        if (!price) {
            const quote = await yahooFinance.quote(trade.symbol).catch(() => null);
            price = quote?.regularMarketPrice;
        }
        
        if (!price) continue;
        const quantity = trade.quantity || Math.floor(trade.amount / price);
        if (quantity < 1) continue;

        const result = await executeLiveTrade({
            brokerType,
            [`${brokerType}ApiKey`]: apiKey.includes(':') ? apiKey.split(':')[0] : apiKey,
            [`${brokerType}ApiSecret`]: apiSecret,
            [`${brokerType}AccessToken`]: apiKey // This is the stored Access Token (apiKey:accessToken)
        }, trade.symbol, quantity, trade.action || 'BUY');

        orderResults.push({ 
            symbol: trade.symbol, 
            quantity, 
            status: result.success ? 'SUCCESS' : 'FAILED', 
            orderId: result.orderId,
            error: result.error
        });
    }
    return orderResults;
};
