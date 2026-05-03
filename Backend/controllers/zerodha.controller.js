import axios from 'axios';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Step 1: Exchange request_token for access_token
export const connectZerodha = async (req, res) => {
    const { apiKey, apiSecret, requestToken } = req.body;
    if (!apiKey || !apiSecret || !requestToken) {
        return res.status(400).json({ error: "Missing required Zerodha credentials" });
    }

    try {
        const checksum = crypto.createHash('sha256').update(apiKey + requestToken + apiSecret).digest('hex');

        const params = new URLSearchParams();
        params.append('api_key', apiKey);
        params.append('request_token', requestToken);
        params.append('checksum', checksum);

        const response = await axios.post('https://api.kite.trade/session/token', params, {
            headers: {
                'X-Kite-Version': '3',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const accessToken = response.data.data.access_token;
        const fullToken = `${apiKey}:${accessToken}`;

        // Calculate Expiry: Zerodha sessions expire at 06:00 AM IST (00:30 UTC)
        const now = new Date();
        const expiryDate = new Date();
        expiryDate.setUTCHours(0, 30, 0, 0);
        if (now.getUTCHours() > 0 || (now.getUTCHours() === 0 && now.getUTCMinutes() >= 30)) {
            expiryDate.setUTCDate(expiryDate.getUTCDate() + 1);
        }

        // Persist Access Token for reuse throughout the day
        if (req.userId) {
            await prisma.user.update({
                where: { id: req.userId },
                data: {
                    brokerType: 'zerodha',
                    zerodhaApiKey: apiKey,
                    zerodhaApiSecret: apiSecret,
                    zerodhaAccessToken: fullToken,
                    zerodhaAccessExpiry: expiryDate
                }
            });
        }

        res.json({ success: true, accessToken, userDetails: response.data.data });
    } catch (error) {
        console.error("[Zerodha] Session generation failed:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to authenticate with Zerodha. Invalid token or API details." });
    }
};

// Step 2: Fetch Holdings using access_token
export const getHoldings = async (req, res) => {
    const { apiKey, accessToken } = req.body;

    // In a real app we'd get these from the DB based on req.userId
    // But since we are building a "Connect to Zerodha" UI, we'll accept them in the body for flexibility.

    if (!apiKey || !accessToken) {
        return res.status(400).json({ error: "Missing active session tokens" });
    }

    try {
        const response = await axios.get('https://api.kite.trade/portfolio/holdings', {
            headers: {
                'X-Kite-Version': '3',
                'Authorization': `token ${apiKey}:${accessToken}`
            }
        });

        // Return exactly what Kite returns in the data property
        res.json(response.data.data);
    } catch (error) {
        console.error("[Zerodha] Fetching holdings failed:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch holdings from Zerodha" });
    }
};

// Step 3: Fetch Live Quotes
export const getQuotes = async (req, res) => {
    const { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({ error: "Missing symbols array" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || user.brokerType !== 'zerodha' || !user.zerodhaAccessToken) {
            return res.status(401).json({ error: "Missing backend Zerodha DB session." });
        }
        const queryParams = symbols.map(s => {
            const cleanly = s.split('.')[0];
            const exchange = s.endsWith('.BO') ? 'BSE' : 'NSE'; // Map to Kite Format
            return `i=${exchange}:${cleanly}`;
        }).join('&');

        const response = await axios.get(`https://api.kite.trade/quote?${queryParams}`, {
            headers: {
                'X-Kite-Version': '3',
                'Authorization': `token ${user.zerodhaAccessToken}`
            }
        });

        // Map kite format back to standard format
        const output = {};
        for (const [key, data] of Object.entries(response.data.data)) {
            const standardSymbol = key.split(':')[1] + (key.split(':')[0] === 'BSE' ? '.BO' : '.NS');
            output[standardSymbol] = {
                price: data.last_price,
                change: ((data.last_price - data.ohlc.close) / data.ohlc.close) * 100
            };
        }
        res.json(output);
    } catch (error) {
        console.error("[Zerodha] Fetching quotes failed:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch live quotes from Zerodha" });
    }
};

// Step 4: Handle Live Order Webhooks (Postbacks)
export const handleWebhook = async (req, res) => {
    try {
        const payload = req.body;
        console.log("[Zerodha Webhook] Received live order update:", payload.order_id, "Status:", payload.status);

        // Acknowledge receipt to Zerodha immediately
        res.status(200).send("OK");

        if (payload.status === 'COMPLETE') {
            console.log(`[Zerodha Webhook] ✅ Execution Confirmed: ${payload.transaction_type} ${payload.filled_quantity} ${payload.tradingsymbol} @ ₹${payload.average_price}`);
            
            // Here you can add logic to update your TradeLog or PortfolioItem models 
            // if you start tracking broker order_ids in your database.
        } else if (payload.status === 'REJECTED') {
            console.error(`[Zerodha Webhook] ❌ Order Rejected: ${payload.status_message}`);
        }
    } catch (error) {
        console.error("[Zerodha Webhook] Critical Error processing postback:", error);
    }
};
