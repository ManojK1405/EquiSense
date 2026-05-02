import prisma from '../utils/prisma.js';
import YahooFinance from 'yahoo-finance2';
import axios from 'axios';
import { isMarketOpen } from '../utils/marketStatus.js';
import { getAIStrategy, generateGeminiText } from '../utils/gemini.js';
import http from 'http';
import https from 'https';
import crypto from 'crypto';

import { fetchSafeQuote } from '../utils/market-fetcher.js';

// Watchlist
export const getDailyReports = async (req, res) => {
  try {
    const reports = await prisma.dailyReport.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
      take: 10
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch daily reports' });
  }
};

export const getWatchlist = async (req, res) => {
  try {
    const watchlist = await prisma.watchlist.findMany({
      where: { userId: req.userId },
      include: { stock: true }
    });
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
};

export const addToWatchlist = async (req, res) => {
  const { symbol } = req.body;
  try {
    let stock = await prisma.stock.findUnique({ where: { symbol } });
    if (!stock) {
      // We might want to fetch initial data for the stock here
      stock = await prisma.stock.create({ data: { symbol } });
    }

    const item = await prisma.watchlist.upsert({
      where: { userId_stockId: { userId: req.userId, stockId: stock.id } },
      update: {},
      create: { userId: req.userId, stockId: stock.id }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
};

export const removeFromWatchlist = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.watchlist.delete({ where: { id } });
    res.json({ message: 'Removed from watchlist' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
};

// Portfolio
export const getPortfolio = async (req, res) => {
  const { mode = 'mock' } = req.query; // Default to mock mode
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (mode === 'live' && user.brokerType === 'zerodha' && user.brokerAccess) {
        try {
            const [holdingsRaw, positionsRaw, marginsRaw] = await Promise.all([
               axios.get('https://api.kite.trade/portfolio/holdings', {
                 headers: { 'X-Kite-Version': '3', 'Authorization': `token ${user.brokerAccess}` },
                 httpsAgent: ipv4Agent
               }),
               axios.get('https://api.kite.trade/portfolio/positions', {
                 headers: { 'X-Kite-Version': '3', 'Authorization': `token ${user.brokerAccess}` },
                 httpsAgent: ipv4Agent
               }),
               axios.get('https://api.kite.trade/user/margins', {
                 headers: { 'X-Kite-Version': '3', 'Authorization': `token ${user.brokerAccess}` },
                 httpsAgent: ipv4Agent
               })
            ]);

            const liveBalance = marginsRaw.data?.data?.equity?.available?.cash || 0;

            const mergedMap = {};
            
            // Map live holdings
            if (holdingsRaw.data.data) {
                holdingsRaw.data.data.forEach(h => {
                   if (h.quantity === 0) return;
                   const sym = h.tradingsymbol + (h.exchange === 'BSE' ? '.BO' : '.NS');
                   if (!mergedMap[sym]) mergedMap[sym] = { quantity: 0, totalVal: 0, currentPrice: h.last_price };
                   mergedMap[sym].quantity += h.quantity;
                   mergedMap[sym].totalVal += (h.quantity * h.average_price);
                });
            }

            // Map live net day positions
            if (positionsRaw.data.data && positionsRaw.data.data.net) {
                positionsRaw.data.data.net.forEach(p => {
                   if (p.quantity === 0) return;
                   const sym = p.tradingsymbol + (p.exchange === 'BSE' ? '.BO' : '.NS');
                   if (!mergedMap[sym]) mergedMap[sym] = { quantity: 0, totalVal: 0, currentPrice: p.last_price };
                   mergedMap[sym].quantity += p.quantity;
                   mergedMap[sym].totalVal += (p.quantity * p.average_price);
                });
            }

            const livePortfolio = Object.entries(mergedMap).map(([symbol, data]) => {
                const totalCost = data.totalVal;
                const currentTotalValue = data.quantity * data.currentPrice;
                const pnl = currentTotalValue - totalCost;
                return {
                    id: `live-${symbol}`,
                    stockId: symbol,
                    stock: { symbol },
                    quantity: data.quantity,
                    avgPrice: totalCost / data.quantity,
                    totalCost: totalCost,
                    currentPrice: data.currentPrice,
                    pnl: pnl,
                    pnlPercent: (pnl / totalCost) * 100,
                    type: 'live'
                };
            });
            
            return res.json({
                items: livePortfolio,
                mockBalance: liveBalance,
                liveBalance: liveBalance,
                autoPilotMock: user.autoPilotMock,
                autoPilotLive: user.autoPilotLive,
                tradingMode: user.tradingMode
            });
        } catch (brokerErr) {
            console.error('Live fetch failed:', brokerErr.message);
            // If live mode explicitly requested and fails, return empty or error, NOT mock fallback
            return res.json({ 
                items: [], 
                mockBalance: 0, 
                liveBalance: 0,
                error: 'Broker synchronization failed. Please check your connection.',
                autoPilotMock: user.autoPilotMock,
                autoPilotLive: user.autoPilotLive,
                tradingMode: user.tradingMode
            });
        }
    }

    // Mock Mode (default or fallback)
    const portfolio = await prisma.portfolioItem.findMany({
      where: { userId: req.userId },
      include: { 
          stock: {
              select: { symbol: true, sector: true }
          } 
      }
    });

    const portfolioWithRealTime = await Promise.all(portfolio.map(async (item) => {
      try {
        const quote = await fetchSafeQuote(item.stock.symbol);
        const currentPrice = quote?.regularMarketPrice || item.avgPrice || 0;
        const currentTotalValue = currentPrice * item.quantity;
        const pnl = currentTotalValue - item.totalCost;
        const pnlPercent = item.totalCost > 0 ? (pnl / item.totalCost) * 100 : 0;

        return {
          ...item,
          currentPrice: currentPrice || 0,
          pnl: pnl || 0,
          pnlPercent: pnlPercent || 0,
          type: 'mock'
        };
      } catch (e) {
        return { 
          ...item, 
          currentPrice: item.avgPrice || 0, 
          pnl: 0, 
          pnlPercent: 0, 
          type: 'mock' 
        };
      }
    }));

    res.json({
      items: portfolioWithRealTime,
      mockBalance: user.mockBalance,
      settlementBalance: user.settlementBalance,
      autoPilotMock: user.autoPilotMock,
      autoPilotLive: user.autoPilotLive,
      tradingMode: user.tradingMode
    });
  } catch (error) {
    console.error('Get Portfolio Error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
};

export const addMockBalance = async (req, res) => {
  const { amount } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { mockBalance: { increment: parseFloat(amount) } }
    });
    res.json({ message: 'Balance updated', balance: user.mockBalance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update balance' });
  }
};

export const engageFullPilot = async (req, res) => {
  const { amount, riskLevel = 'moderate', sector = 'any' } = req.body;
  const investAmount = parseFloat(amount);

  if (!investAmount || investAmount <= 0) {
    return res.status(400).json({ error: 'Valid investment amount is required.' });
  }

  try {
    // 1. Generate Intelligent Portfolio using Gemini
    const prompt = `
        Persona: Institutional Fund Manager.
        Objective: Construct a high-conviction, diversified portfolio of exactly 5 liquid Indian equity tickers for immediate deployment.
        
        Mandate: 
        - Total Capital: ₹${investAmount}
        - Risk Tolerance: ${riskLevel}
        - Sector Focus: ${sector}
        
        Output:
        - Return a JSON object with a "trades" array.
        - Each trade must have: "name" (symbol with .NS), "amount" (allocation in ₹), "reason" (short institutional logic).
        - Ensure total allocation sums to exactly ₹${investAmount}.
        - Format: { "trades": [ { "name": "RELIANCE.NS", "amount": 2500, "reason": "Leading energy conglomerate with robust cash flows" }, ... ] }
    `;

    const rawStrategy = await getAIStrategy(prompt);
    const parsed = JSON.parse(rawStrategy);
    const trades = parsed.trades || [];

    if (!trades.length) throw new Error("AI failed to generate a valid portfolio.");

    // 2. Immediate Execution Logic (Mock Mode for now as per usual Pilot start)
    // We reuse the internal execution flow
    const executionResults = [];
    const preparedTrades = [];

    for (const t of trades) {
        const quote = await yahooFinance.quote(t.name).catch(() => null);
        const price = quote?.regularMarketPrice;
        if (!price) continue;

        const quantity = Math.floor(t.amount / price);
        if (quantity <= 0) continue;

        const actualAmount = quantity * price;
        preparedTrades.push({ symbol: t.name, price, quantity, actualAmount, reason: t.reason });
    }

    const totalActualSpent = preparedTrades.reduce((sum, t) => sum + t.actualAmount, 0);

    // Ensure stocks exist in DB
    for (const pt of preparedTrades) {
        let stock = await prisma.stock.findUnique({ where: { symbol: pt.symbol } });
        if (!stock) stock = await prisma.stock.create({ data: { symbol: pt.symbol } });
        pt.stockId = stock.id;
    }

    // Database Transaction: Execute Trades + Enable Pilot
    if (!isMarketOpen()) {
        const updateData = { tradingMode: req.body.mode || 'mock' };
        if (req.body.mode === 'live') {
            updateData.autoPilotLive = true;
            updateData.pilotLimitLive = investAmount;
        } else {
            updateData.autoPilotMock = true;
            updateData.pilotLimitMock = investAmount;
        }

        await prisma.$transaction([
            prisma.user.update({ where: { id: req.userId }, data: updateData }),
            prisma.queuedTrade.create({
                data: {
                    userId: req.userId,
                    trades: preparedTrades.map(t => ({ ...t, action: 'BUY' })),
                    status: 'PENDING',
                    brokerType: req.body.mode === 'live' ? 'zerodha' : 'mock'
                }
            })
        ]);

        return res.json({
            message: `Intelligence Engaged. Market is closed. Portfolio of ${preparedTrades.length} assets queued for execution at market open.`,
            deployed: [],
            totalInvested: 0
        });
    }

    await prisma.$transaction(async (tx) => {
        const updateData = {
            tradingMode: 'mock'
        };

        if (req.body.mode === 'live') {
            updateData.autoPilotLive = true;
            updateData.pilotLimitLive = investAmount;
        } else {
            updateData.autoPilotMock = true;
            updateData.pilotLimitMock = investAmount;
            updateData.mockBalance = { decrement: totalActualSpent };
        }

        // Update user: Deduct balance + Enable Pilot + Set Limit
        await tx.user.update({
            where: { id: req.userId },
            data: updateData
        });

        for (const pt of preparedTrades) {
            await tx.portfolioItem.upsert({
                where: { userId_stockId: { userId: req.userId, stockId: pt.stockId } },
                update: {
                    quantity: { increment: pt.quantity },
                    totalCost: { increment: pt.actualAmount },
                    avgPrice: { set: 0 }
                },
                create: {
                    userId: req.userId,
                    stockId: pt.stockId,
                    quantity: pt.quantity,
                    avgPrice: pt.price,
                    totalCost: pt.actualAmount
                }
            });

            await tx.tradeLog.create({
                data: {
                    userId: req.userId,
                    symbol: pt.symbol,
                    action: 'BUY',
                    quantity: pt.quantity,
                    price: pt.price,
                    totalAmount: pt.actualAmount,
                    type: req.body.mode === 'live' ? 'LIVE' : 'MOCK',
                    mode: 'AI_PILOT',
                    strategyName: 'AI Pilot Initial Deployment',
                    reason: `Initial Deployment: ${pt.reason}`
                }
            });
            executionResults.push({ symbol: pt.symbol, qty: pt.quantity, status: 'SUCCESS' });
        }
    }, { timeout: 30000 });

    res.json({
        message: `Intelligence Engaged. Portfolio of ${executionResults.length} assets deployed.`,
        deployed: executionResults,
        totalInvested: totalActualSpent
    });

  } catch (error) {
    console.error('[EngageFullPilot] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to engage full AI pilot.' });
  }
};

export const toggleAutoPilot = async (req, res) => {
  const { enabled, mode = 'mock', limit = null } = req.body;
  try {
    const data = {};
    if (mode === 'live') {
      data.autoPilotLive = enabled;
      if (limit) data.pilotLimitLive = parseFloat(limit);
    } else {
      data.autoPilotMock = enabled;
      if (limit) data.pilotLimitMock = parseFloat(limit);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data
    });

    res.json({ 
      message: `AI Pilot (${mode.toUpperCase()}) ${enabled ? 'Engaged' : 'Disengaged'}`,
      autoPilotMock: user.autoPilotMock,
      autoPilotLive: user.autoPilotLive,
      pilotLimitMock: user.pilotLimitMock,
      pilotLimitLive: user.pilotLimitLive
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle AI pilot' });
  }
};

export const setTradingMode = async (req, res) => {
    const { mode } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.userId },
            data: { tradingMode: mode }
        });
        res.json({ message: `Switched to ${mode} mode`, mode: user.tradingMode });
    } catch (e) {
        res.status(500).json({ error: 'Failed to switch mode' });
    }
};

export const buyMockStock = async (req, res) => {
  const { symbol, quantity, price } = req.body;
  const totalCost = quantity * price;

  try {
    if (!isMarketOpen()) {
        await prisma.queuedTrade.create({
            data: {
                userId: req.userId,
                trades: [{ symbol, quantity, price, action: 'BUY' }],
                status: 'PENDING'
            }
        });
        return res.json({ message: 'Market is closed. Order has been scheduled for market open.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.mockBalance < totalCost) {
      return res.status(400).json({ error: 'Insufficient mock balance' });
    }

    let stock = await prisma.stock.findUnique({ where: { symbol } });
    if (!stock) stock = await prisma.stock.create({ data: { symbol } });

    // Transactional update: deduct balance and add portfolio item
    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: { mockBalance: { decrement: totalCost } }
      }),
      prisma.portfolioItem.upsert({
        where: { userId_stockId: { userId: req.userId, stockId: stock.id } },
        update: {
          quantity: { increment: quantity },
          totalCost: { increment: totalCost },
          avgPrice: { set: 0 } // Re-calculated after update in next step or via DB trigger
        },
        create: {
          userId: req.userId,
          stockId: stock.id,
          quantity,
          avgPrice: price,
          totalCost
        }
      })
    ]);

    // Re-calculate avgPrice (simplified)
    const updatedItem = await prisma.portfolioItem.findUnique({
      where: { userId_stockId: { userId: req.userId, stockId: stock.id } }
    });
    await prisma.portfolioItem.update({
      where: { id: updatedItem.id },
      data: { avgPrice: updatedItem.totalCost / updatedItem.quantity }
    });

    res.json({ message: 'Order executed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute buy order' });
  }
};

export const sellMockStock = async (req, res) => {
  const { symbol, quantity, price } = req.body;
  try {
    if (!isMarketOpen()) {
        await prisma.queuedTrade.create({
            data: {
                userId: req.userId,
                trades: [{ symbol, quantity, price, action: 'SELL' }],
                status: 'PENDING'
            }
        });
        return res.json({ message: 'Market is closed. Sale has been scheduled for market open.' });
    }

    let stock = await prisma.stock.findUnique({ where: { symbol } });
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const item = await prisma.portfolioItem.findUnique({
      where: { userId_stockId: { userId: req.userId, stockId: stock.id } }
    });

    if (!item || item.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient quantity to sell' });
    }

    const sellProceeds = quantity * price;
    const costOfGoodsSold = (item.totalCost / item.quantity) * quantity;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: { mockBalance: { increment: sellProceeds } }
      }),
      item.quantity === quantity 
        ? prisma.portfolioItem.delete({ where: { id: item.id } })
        : prisma.portfolioItem.update({
            where: { id: item.id },
            data: {
              quantity: { decrement: quantity },
              totalCost: { decrement: costOfGoodsSold }
            }
          })
    ]);

    res.json({ message: 'Sale executed successfully', proceeds: sellProceeds });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute sell order' });
  }
};

export const skipTrade = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.queuedTrade.update({
      where: { id, userId: req.userId },
      data: { status: 'SKIPPED' }
    });
    res.json({ message: 'Order skipped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to skip order' });
  }
};

export const getTradeLogs = async (req, res) => {
  try {
    const logs = await prisma.tradeLog.findMany({
      where: { userId: req.userId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trade logs' });
  }
};

export const addPortfolioItem = async (req, res) => {
  const { symbol, quantity, avgPrice } = req.body;
  try {
    let stock = await prisma.stock.findUnique({ where: { symbol } });
    if (!stock) {
      stock = await prisma.stock.create({ data: { symbol } });
    }

    const existingItem = await prisma.portfolioItem.findUnique({
      where: { userId_stockId: { userId: req.userId, stockId: stock.id } }
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const newTotalCost = existingItem.totalCost + (quantity * avgPrice);
      const newAvgPrice = newTotalCost / newQuantity;

      const updated = await prisma.portfolioItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          avgPrice: newAvgPrice,
          totalCost: newTotalCost
        }
      });
      return res.json(updated);
    }

    const item = await prisma.portfolioItem.create({
      data: {
        userId: req.userId,
        stockId: stock.id,
        quantity,
        avgPrice,
        totalCost: quantity * avgPrice
      }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to portfolio' });
  }
};

export const syncBroker = async (req, res) => {
  let { brokerType, apiKey, apiSecret, requestToken } = req.body;
  if (!apiKey) return res.status(401).json({ error: 'API Key is missing' });

  let expiryDate = null;
  let positions = [];
  let authenticatedAccessToken = null;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    let rawApiKey = apiKey;
    let accessToken = null;

    if (apiKey === 'PERSISTED_IN_DB') {
        if (!user || !user.brokerApiKey) return res.status(401).json({ error: 'No stored credentials' });
        rawApiKey = user.brokerApiKey;
        accessToken = user.brokerAccess;
    }

    if (brokerType === 'zerodha') {
      try {
        const now = new Date();

        if (requestToken) {
            // STEP 1: Exchange Request Token for a reusable Access Token
            let secretToUse = apiSecret;
            
            // If the frontend sent a placeholder, or secret is missing from request, check DB
            if (!secretToUse || secretToUse === 'PERSISTED_IN_DB') {
                secretToUse = user?.brokerApiSecret;
            }

            if (!secretToUse || secretToUse === 'PERSISTED_IN_DB') {
                throw new Error('API Secret is missing or corrupted. Please re-enter your Secret in Settings.');
            }
            const checksum = crypto.createHash('sha256').update(rawApiKey + requestToken + secretToUse).digest('hex');

            const params = new URLSearchParams();
            params.append('api_key', rawApiKey);
            params.append('request_token', requestToken);
            params.append('checksum', checksum);

            const sessionResp = await axios.post('https://api.kite.trade/session/token', params, {
                headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
                httpsAgent: ipv4Agent
            });

            // Store the Access Token (format: apiKey:accessToken)
            accessToken = `${rawApiKey}:${sessionResp.data.data.access_token}`;
            authenticatedAccessToken = accessToken; // Mark for DB persistence

            // Calculate Expiry: Zerodha sessions expire at 06:00 AM IST (00:30 UTC)
            expiryDate = new Date();
            expiryDate.setUTCHours(0, 30, 0, 0);
            if (now.getUTCHours() > 0 || (now.getUTCHours() === 0 && now.getUTCMinutes() >= 30)) {
                expiryDate.setUTCDate(expiryDate.getUTCDate() + 1);
            }
            console.log('[Zerodha] Handshake SUCCESS. Storing reusable Access Token. Expiry:', expiryDate);
        } else if (user?.brokerAccess && (!user?.brokerAccessExpiry || user.brokerAccessExpiry > now)) {
            // STEP 2: Reuse stored Access Token (The "Store once, use all day" logic)
            console.log('[Zerodha] Attempting session reuse for user:', user.id);
            try {
                await axios.get('https://api.kite.trade/user/margins', {
                    headers: { 'X-Kite-Version': '3', 'Authorization': `token ${user.brokerAccess}` }
                });
                accessToken = user.brokerAccess;
                console.log('[Zerodha] Stored Access Token is still valid. Reusing session.');
            } catch (err) {
                console.log('[Zerodha] Stored session expired or invalid. Requiring fresh authorization.');
                await prisma.user.update({
                    where: { id: req.userId },
                    data: { brokerAccess: null, brokerAccessExpiry: null }
                });
                return res.json({
                    message: 'Broker session expired. Please re-authorize.',
                    loginUrl: `https://kite.zerodha.com/connect/login?v=3&api_key=${rawApiKey}`
                });
            }
            } else {
                // No token and no valid session — return loginUrl so frontend can redirect
                if (rawApiKey && apiSecret && apiSecret !== 'PERSISTED_IN_DB') {
                    await prisma.user.update({
                        where: { id: req.userId },
                        data: { brokerType, brokerApiKey: rawApiKey, brokerApiSecret: apiSecret }
                    });
                } else if (rawApiKey) {
                    await prisma.user.update({
                        where: { id: req.userId },
                        data: { brokerType, brokerApiKey: rawApiKey }
                    });
                }
                return res.json({
                    message: 'Credentials saved. Please authorize on Zerodha.',
                    loginUrl: `https://kite.zerodha.com/connect/login?v=3&api_key=${rawApiKey}`
                });
            }

        const [holdingsRaw, positionsRaw] = await Promise.all([
           axios.get('https://api.kite.trade/portfolio/holdings', {
             headers: { 'X-Kite-Version': '3', 'Authorization': `token ${accessToken}` },
             httpsAgent: ipv4Agent
           }),
           axios.get('https://api.kite.trade/portfolio/positions', {
             headers: { 'X-Kite-Version': '3', 'Authorization': `token ${accessToken}` },
             httpsAgent: ipv4Agent
           })
        ]);

        const holdings = holdingsRaw.data.data || [];
        const netPositions = positionsRaw.data.data?.net || [];

        const mergedMap = {};

        // Process Long-Term Holdings
        holdings.forEach(h => {
           if (h.quantity === 0) return;
           const sym = h.tradingsymbol + (h.exchange === 'BSE' ? '.BO' : '.NS');
           if (!mergedMap[sym]) mergedMap[sym] = { quantity: 0, totalVal: 0 };
           mergedMap[sym].quantity += h.quantity;
           mergedMap[sym].totalVal += (h.quantity * h.average_price);
        });

        // Process Live Intraday/Derivative Positions
        netPositions.forEach(p => {
           if (p.quantity === 0) return;
           const sym = p.tradingsymbol + (p.exchange === 'BSE' ? '.BO' : '.NS');
           if (!mergedMap[sym]) mergedMap[sym] = { quantity: 0, totalVal: 0 };
           mergedMap[sym].quantity += p.quantity;
           mergedMap[sym].totalVal += (p.quantity * p.average_price);
        });

        // Calculate blended averages for final database payload
        positions = Object.entries(mergedMap).map(([symbol, data]) => ({
           symbol: symbol,
           quantity: data.quantity,
           avgPrice: data.totalVal / data.quantity
        }));
        authenticatedAccessToken = accessToken; // Save token for client return
      } catch (err) {
        console.error('Zerodha Sync Error:', err.response?.data || err.message);
        throw new Error('Zerodha authentication failed. Check your API credentials and ensure the Request Token is fresh.');
      }
    } else if (brokerType === 'groww') {
      try {
        // Groww API Implementation - FORCED IPv4
        const response = await axios.get('https://api.groww.in/v1/holdings/user', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-API-SECRET': apiSecret,
            'X-API-VERSION': '1.0',
            'Accept': 'application/json'
          },
          httpsAgent: ipv4Agent
        });
        const holdings = response.data.holdings || response.data.data?.holdings || [];
        positions = holdings.map(h => ({
          symbol: h.symbol?.includes('.') ? h.symbol : `${h.symbol}.NS`,
          quantity: h.qty || h.quantity,
          avgPrice: h.avg_price || h.average_price
        }));
      } catch (err) {
        console.error('Groww Auth Fail Detail:', err.response?.data || err.message);
        throw new Error('Groww authentication failed. Invalid API credentials or session.');
      }
    } else {
      return res.status(400).json({ error: 'Unsupported broker type.' });
    }

    // Only update DB if we performed a fresh handshake
    if (authenticatedAccessToken) {
        await prisma.user.update({
            where: { id: req.userId },
            data: {
                brokerType: brokerType,
                brokerApiKey: rawApiKey,
                brokerApiSecret: apiSecret || user?.brokerApiSecret || null,
                brokerAccess: authenticatedAccessToken,
                brokerAccessExpiry: expiryDate
            }
        });
    }

    res.json({ 
        message: 'Live broker connected securely.', 
        synced: positions.length, 
        accessToken: authenticatedAccessToken || accessToken 
    });
  } catch (error) {
    console.error('Broker Sync Error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync broker' });
  }
};

export const disconnectBroker = async (req, res) => {
    try {
        await prisma.user.update({
            where: { id: req.userId },
            data: {
                brokerType: null,
                brokerApiKey: null,
                brokerApiSecret: null,
                brokerAccess: null,
                brokerAccessExpiry: null,
                tradingMode: 'mock' // Revert to mock mode on disconnect
            }
        });
        res.json({ message: 'Broker disconnected and credentials purged.' });
    } catch (error) {
        console.error('Broker Disconnect Error:', error);
        res.status(500).json({ error: 'Failed to disconnect broker' });
    }
};

export const executeStrategy = async (req, res) => {
  const { mode = 'mock', trades, totalCapital } = req.body;
  
  if (!trades || !Array.isArray(trades)) return res.status(400).json({ error: 'Invalid trades payload.' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (mode === 'mock') {
      const capital = totalCapital || trades.reduce((sum, t) => sum + (t.amount || 0), 0);
      if (user.mockBalance < capital) {
        return res.status(400).json({ error: `Insufficient mock funds. Required: ₹${capital.toLocaleString()}, Available: ₹${user.mockBalance.toLocaleString()}` });
      }

      // Step 1: Prepare all data outside the transaction (Avoid network requests inside TX)
      const executionResults = [];
      const preparedTrades = [];

      for (const trade of trades) {
        const symbol = trade.name;
        let price = trade.price;
        
        if (!price) {
          try {
            const quote = await yahooFinance.quote(symbol);
            price = quote?.regularMarketPrice;
          } catch (e) {
            console.error(`[Mock Execution] Price fetch failed for ${symbol}:`, e.message);
          }
          // Final fallback
          if (!price) price = (trade.amount / (trade.weight / 100)) || 1;
        }

        const quantity = trade.quantity || Math.floor(trade.amount / price);
        const actualAmount = quantity * price;
        preparedTrades.push({ ...trade, symbol, price, quantity, actualAmount });
      }

      const totalActualSpent = preparedTrades.reduce((sum, t) => sum + (t.actualAmount || 0), 0);

      // Step 2: Ensure all Stock records exist (Outside Transaction)
      for (const trade of preparedTrades) {
        if (trade.quantity <= 0) continue; // Skip zero quantity trades
        let stock = await prisma.stock.findUnique({ where: { symbol: trade.symbol } });
        if (!stock) {
          stock = await prisma.stock.create({ data: { symbol: trade.symbol } });
        }
        trade.stockId = stock.id;
      }

      if (!isMarketOpen()) {
        await prisma.queuedTrade.create({
          data: {
            userId: req.userId,
            trades: preparedTrades.map(t => ({ ...t, action: 'BUY' })),
            status: 'PENDING',
            brokerType: 'mock'
          }
        });

        // Save the strategy itself as part of deployment
        await prisma.savedStrategy.create({
          data: {
            userId: req.userId,
            name: `Deployed Strategy ${new Date().toLocaleDateString()}`,
            data: { trades: preparedTrades, totalCapital: totalActualSpent }
          }
        });

        return res.json({ 
          isQueued: true,
          message: `Market is closed. Strategy of ₹${capital.toLocaleString()} queued for execution at market open.`
        });
      }

      // Step 3: Execute Database Transaction with extended timeout
      await prisma.$transaction(async (tx) => {
        // Deduct actual spent balance
        await tx.user.update({
          where: { id: req.userId },
          data: { mockBalance: { decrement: totalActualSpent } }
        });

        for (const trade of preparedTrades) {
          if (trade.quantity <= 0) continue;

          // Upsert Portfolio
          await tx.portfolioItem.upsert({
            where: { userId_stockId: { userId: req.userId, stockId: trade.stockId } },
            update: {
              quantity: { increment: trade.quantity },
              totalCost: { increment: trade.actualAmount },
              avgPrice: { set: 0 } // Re-calc flag
            },
            create: {
              userId: req.userId,
              stockId: trade.stockId,
              quantity: trade.quantity,
              avgPrice: trade.price,
              totalCost: trade.actualAmount
            }
          });

          // Log Trade
          await tx.tradeLog.create({
            data: {
              userId: req.userId,
              symbol: trade.symbol,
              action: 'BUY',
              quantity: trade.quantity,
              price: trade.price,
              totalAmount: trade.actualAmount,
              type: 'MOCK',
              mode: 'MANUAL',
              strategyId: 'STRAT-' + Date.now(), // Generate a temp ID if none provided
              strategyName: 'Strategy Blueprint Execution',
              reason: `Strategy Deployment: ${trade.reason || 'Asset Allocation'}`
            }
          });

          executionResults.push({ symbol: trade.symbol, quantity: trade.quantity, status: 'SUCCESS' });
        }

        // Optional: Save the strategy itself as part of deployment
        await tx.savedStrategy.create({
          data: {
            userId: req.userId,
            name: `Deployed Strategy ${new Date().toLocaleDateString()}`,
            data: { trades: preparedTrades, totalCapital: totalActualSpent }
          }
        });
      }, {
        timeout: 30000 // 30s timeout to prevent 'Transaction not found' during bulk updates
      });

      return res.json({ 
        message: `Strategy deployed successfully in Mock Mode. ₹${capital.toLocaleString()} allocated.`,
        results: executionResults
      });

    } else {
      // LIVE MODE
      if (!user.brokerAccess || !user.brokerApiKey) {
        return res.status(401).json({ error: 'Live broker not connected. Please visit Settings.' });
      }

      // Optional: Check Live Margins (Zerodha example)
      if (user.brokerType === 'zerodha') {
        try {
          const marginsRaw = await axios.get('https://api.kite.trade/user/margins', {
            headers: { 'X-Kite-Version': '3', 'Authorization': `token ${user.brokerAccess}` }
          });
          const availableCash = marginsRaw.data?.data?.equity?.available?.cash || 0;
          if (availableCash < totalCapital) {
            return res.status(400).json({ error: `Insufficient live funds. Required: ₹${totalCapital.toLocaleString()}, Available: ₹${availableCash.toLocaleString()}` });
          }
        } catch (e) {
          console.error('Margin check failed:', e.message);
        }
      }

      if (isMarketOpen()) {
        const results = await processTradesImmediately(user.brokerAccess, user.brokerApiSecret, user.brokerType, trades.map(t => ({ ...t, symbol: t.name })));
        
        // Save the strategy itself as part of deployment
        await prisma.savedStrategy.create({
          data: {
            userId: req.userId,
            name: `Live Strategy Deployment ${new Date().toLocaleDateString()}`,
            data: { trades: trades.map(t => ({ ...t, symbol: t.name })), totalCapital: parseFloat(totalCapital) }
          }
        });

        return res.json({ 
          message: `Strategy execution initiated via ${user.brokerType?.toUpperCase()}.`, 
          results 
        });
      } else {
        // Queue for later
        await prisma.queuedTrade.create({
          data: {
            user: { connect: { id: req.userId } },
            trades: trades.map(t => ({ ...t, symbol: t.name })),
            brokerApiKey: user.brokerApiKey,
            brokerApiSecret: user.brokerApiSecret,
            brokerType: user.brokerType || 'zerodha',
            status: 'PENDING'
          }
        });

        // Save the strategy itself even if queued
        await prisma.savedStrategy.create({
          data: {
            userId: req.userId,
            name: `Queued Strategy ${new Date().toLocaleDateString()}`,
            data: { trades: trades.map(t => ({ ...t, symbol: t.name })), totalCapital: parseFloat(totalCapital) }
          }
        });

        return res.json({ 
          message: 'Market is closed. Strategy has been queued for execution at next market open.',
          isQueued: true
        });
      }
    }
  } catch (error) {
    console.error('Execution Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process strategy execution.' });
  }
};

// Helper to execute trades immediately
const processTradesImmediately = async (apiKey, apiSecret, brokerType, trades) => {
  const orderResults = [];
  for (const trade of trades) {
    if (!trade.symbol) continue;
    
    let price = trade.price;
    if (!price) {
      const quote = await yahooFinance.quote(trade.symbol).catch(() => null);
      price = quote?.regularMarketPrice;
    }
    
    if (!price) continue;
    const quantity = Math.floor(trade.amount / price);
    if (quantity < 1) continue;

    try {
      const symbolOnly = trade.symbol.split('.')[0];
      let orderResponse;

      if (brokerType === 'zerodha') {
        orderResponse = await axios.post('https://api.kite.trade/orders/regular', {
          tradingsymbol: symbolOnly,
          exchange: trade.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
          transaction_type: 'BUY',
          order_type: 'MARKET',
          quantity: quantity,
          product: 'CNC',
          validity: 'DAY'
        }, {
          headers: {
            'X-Kite-Version': '3',
            'Authorization': `token ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      } else if (brokerType === 'groww') {
        // Groww API Order Placement
        orderResponse = await axios.post('https://api.groww.in/v1/trade/orders', {
          symbol: trade.symbol,
          qty: quantity,
          side: 'BUY',
          type: 'MARKET'
        }, {
          headers: {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret,
            'Content-Type': 'application/json'
          }
        });
      }
      
      const orderId = brokerType === 'zerodha' ? orderResponse.data?.data?.order_id : orderResponse.data?.order_id;
      orderResults.push({ symbol: trade.symbol, quantity, status: 'SUCCESS', orderId });
    } catch (err) {
      orderResults.push({ symbol: trade.symbol, quantity, status: 'FAILED', error: err.response?.data?.message || err.message });
    }
  }
  return orderResults;
};

// Background processor export
export const processPendingQueue = async () => {
  if (!isMarketOpen()) return { message: 'Market is still closed.' };

  const pending = await prisma.queuedTrade.findMany({
    where: { status: 'PENDING' },
    include: { user: true },
    take: 10 // process in batches
  });

  for (const item of pending) {
    try {
      console.log(`[Queue] Executing strategy ${item.id} for user ${item.userId} via ${item.brokerType}`);
      
      let results = [];
      
      if (item.brokerType === 'mock') {
        const user = await prisma.user.findUnique({ where: { id: item.userId } });
        let currentMockBalance = user.mockBalance;
        
        for (const trade of item.trades) {
            let price = trade.price;
            if (!price) {
                try {
                    const quote = await yahooFinance.quote(trade.symbol);
                    price = quote?.regularMarketPrice || 1;
                } catch(e) { price = 1; }
            }
            
            const totalCost = trade.quantity * price;
            
            if (trade.action === 'BUY') {
                if (currentMockBalance < totalCost) {
                    results.push({ symbol: trade.symbol, status: 'FAILED', error: 'Insufficient mock funds' });
                    continue;
                }
                
                let stock = await prisma.stock.findUnique({ where: { symbol: trade.symbol } });
                if (!stock) stock = await prisma.stock.create({ data: { symbol: trade.symbol } });
                
                await prisma.$transaction([
                    prisma.user.update({ where: { id: item.userId }, data: { mockBalance: { decrement: totalCost } } }),
                    prisma.portfolioItem.upsert({
                        where: { userId_stockId: { userId: item.userId, stockId: stock.id } },
                        update: { quantity: { increment: trade.quantity }, totalCost: { increment: totalCost }, avgPrice: { set: 0 } },
                        create: { userId: item.userId, stockId: stock.id, quantity: trade.quantity, avgPrice: price, totalCost }
                    }),
                    prisma.tradeLog.create({
                        data: {
                            userId: item.userId, symbol: trade.symbol, action: 'BUY', quantity: trade.quantity, price, totalAmount: totalCost, type: 'MOCK'
                        }
                    })
                ]);
                currentMockBalance -= totalCost;
                results.push({ symbol: trade.symbol, status: 'SUCCESS' });
                
            } else if (trade.action === 'SELL') {
                let stock = await prisma.stock.findUnique({ where: { symbol: trade.symbol } });
                if (!stock) {
                    results.push({ symbol: trade.symbol, status: 'FAILED', error: 'Stock not found' });
                    continue;
                }
                
                const pItem = await prisma.portfolioItem.findUnique({ where: { userId_stockId: { userId: item.userId, stockId: stock.id } } });
                if (!pItem || pItem.quantity < trade.quantity) {
                    results.push({ symbol: trade.symbol, status: 'FAILED', error: 'Insufficient quantity to sell' });
                    continue;
                }
                
                const costOfGoodsSold = (pItem.totalCost / pItem.quantity) * trade.quantity;
                
                await prisma.$transaction([
                    prisma.user.update({ where: { id: item.userId }, data: { mockBalance: { increment: totalCost } } }),
                    trade.quantity === pItem.quantity 
                        ? prisma.portfolioItem.delete({ where: { id: pItem.id } })
                        : prisma.portfolioItem.update({ where: { id: pItem.id }, data: { quantity: { decrement: trade.quantity }, totalCost: { decrement: costOfGoodsSold } } }),
                    prisma.tradeLog.create({
                        data: {
                            userId: item.userId, symbol: trade.symbol, action: 'SELL', quantity: trade.quantity, price, totalAmount: totalCost, type: 'MOCK'
                        }
                    })
                ]);
                currentMockBalance += totalCost;
                results.push({ symbol: trade.symbol, status: 'SUCCESS' });
            }
        }
      } else {
        // Live Trades
        const authKey = item.user.brokerAccess || item.brokerApiKey;
        results = await processTradesImmediately(authKey, item.brokerApiSecret, item.brokerType || 'zerodha', item.trades);
      }
      
      const failed = results.filter(r => r.status === 'FAILED');
      await prisma.queuedTrade.update({
        where: { id: item.id },
        data: {
          status: failed.length === results.length ? 'FAILED' : 'EXECUTED',
          error: failed.length > 0 ? JSON.stringify(failed) : null
        }
      });
    } catch (err) {
      await prisma.queuedTrade.update({
        where: { id: item.id },
        data: { status: 'FAILED', error: err.message }
      });
    }
  }
};

export const getTradeQueue = async (req, res) => {
  try {
    const queue = await prisma.queuedTrade.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trade queue' });
  }
};

export const retryTrade = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.queuedTrade.update({
      where: { id, userId: req.userId },
      data: { status: 'PENDING', error: null }
    });
    res.json({ message: 'Trade re-queued for execution' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retry trade' });
  }
};

export const dismissTrade = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.queuedTrade.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Trade dismissed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss trade' });
  }
};

export const getBrokerOrders = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || user.brokerType !== 'zerodha' || !user.brokerAccess) {
            return res.json([]); // No live broker connected
        }

        try {
            const response = await axios.get('https://api.kite.trade/orders', {
                headers: { 'X-Kite-Version': '3', 'Authorization': `token ${user.brokerAccess}` }
            });
            res.json(response.data.data || []);
        } catch (axiosErr) {
            if (axiosErr.response?.status === 403 || axiosErr.response?.data?.error_type === 'TokenException') {
                console.log('[Kite] Session expired for user:', req.userId);
                // Invalidate the token in DB so UI can prompt for re-auth
                await prisma.user.update({
                    where: { id: req.userId },
                    data: { brokerAccess: null, brokerAccessExpiry: null }
                });
                return res.status(403).json({ error: 'Broker session expired. Please re-authenticate in Settings.' });
            }
            throw axiosErr;
        }
    } catch (error) {
        console.error('Fetch Orders Error:', error.message || error);
        res.status(500).json({ error: 'Failed to fetch broker orders' });
    }
};

export const saveStrategy = async (req, res) => {
    try {
        const { name, description, data } = req.body;
        const strategy = await prisma.savedStrategy.create({
            data: {
                userId: req.userId,
                name,
                description,
                data
            }
        });
        res.json(strategy);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save strategy' });
    }
};

export const getSavedStrategies = async (req, res) => {
    try {
        const strategies = await prisma.savedStrategy.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(strategies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch strategies' });
    }
};

export const deleteSavedStrategy = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.savedStrategy.delete({
            where: { id, userId: req.userId }
        });
        res.json({ message: 'Strategy deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete strategy' });
    }
};

export const analyzePortfolio = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const items = await prisma.portfolioItem.findMany({
      where: { userId: req.userId },
      include: { stock: true }
    });

    if (items.length === 0) {
      return res.json({ analysis: "Your portfolio is currently empty. Start by adding stocks or engaging the AI Pilot to begin your wealth journey." });
    }

    // Prepare portfolio context for Gemini
    const holdingsContext = items.map(i => `${i.stock.symbol}: ${i.quantity} units @ ₹${i.avgPrice}`).join('\n');
    
    const prompt = `
      Persona: Chief Investment Officer (CIO) at a top-tier global hedge fund.
      Task: Provide a high-fidelity, institutional-grade analysis of the following portfolio.
      
      Current Holdings:
      ${holdingsContext}
      
      Requirements:
      1. Analyze sector concentration risk.
      2. Identify potential volatility headwinds based on current holdings.
      3. Provide exactly 3 actionable "Institutional Moves" (e.g., hedge, trim, or increase exposure).
      4. Use a professional, insight-heavy tone.
      5. Format as a clean report with headers: [Concentration], [Risk Exposure], [Strategic Suggestions].
    `;

    const analysis = await generateGeminiText(prompt);
    res.json({ analysis });
  } catch (error) {
    console.error('Portfolio Analysis Error:', error);
    res.status(500).json({ error: 'Failed to generate portfolio analysis' });
  }
};

export const terminatePosition = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.portfolioItem.findUnique({
      where: { id, userId: req.userId },
      include: { stock: true }
    });

    if (!item) return res.status(404).json({ error: 'Position not found' });

    // Handle Market Closed: Queue for later
    if (!isMarketOpen()) {
        await prisma.queuedTrade.create({
            data: {
                userId: req.userId,
                trades: [{ 
                    symbol: item.stock.symbol, 
                    quantity: item.quantity, 
                    action: 'SELL',
                    reason: 'Manual Liquidation (Market Closed)'
                }],
                status: 'PENDING',
                brokerType: 'mock' // Defaulting to mock for this specific terminal action
            }
        });
        return res.json({ 
            message: 'Market is closed. Liquidation has been queued for execution at market open.',
            isQueued: true
        });
    }

    // Market Open: Immediate Liquidation
    const quote = await yahooFinance.quote(item.stock.symbol).catch(() => null);
    const currentPrice = quote?.regularMarketPrice || item.avgPrice;
    const liquidationValue = currentPrice * item.quantity;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: { mockBalance: { increment: liquidationValue } }
      }),
      prisma.tradeLog.create({
        data: {
          userId: req.userId,
          symbol: item.stock.symbol,
          action: 'SELL',
          quantity: item.quantity,
          price: currentPrice,
          totalAmount: liquidationValue,
          type: 'MOCK',
          mode: 'MANUAL',
          strategyName: 'Manual Liquidation',
          reason: 'Position terminated by user (Market Open)'
        }
      }),
      prisma.portfolioItem.delete({ where: { id: item.id } })
    ]);

    res.json({ message: 'Position liquidated successfully', proceeds: liquidationValue });
  } catch (error) {
    console.error('Liquidation Error:', error);
    res.status(500).json({ error: 'Failed to liquidate position' });
  }
};
