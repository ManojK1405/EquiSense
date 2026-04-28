import prisma from '../utils/prisma.js';
import YahooFinance from 'yahoo-finance2';
import { isMarketOpen } from '../utils/marketStatus.js';
import { executeLiveTrade } from './broker.service.js';
const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

const TARGET_STOCKS = [
    // Blue Chips
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'ASIANPAINT.NS', 'LT.NS', 
    // High-Growth / Mid-Cap / Trending
    'ADANIENT.NS', 'TITAN.NS', 'M&M.NS', 'SUNPHARMA.NS', 'TATASTEEL.NS', 'KPITTECH.NS', 'DIXON.NS', 'ZOMATO.NS', 'HAL.NS', 'BEL.NS', 
    'RVNL.NS', 'IRFC.NS', 'BHEL.NS', 'JIOFIN.NS', 'TATAELXSI.NS', 'POLYCAB.NS', 'MAZDOCK.NS', 'COCHINSHIP.NS', 'IRCTC.NS', 'PFC.NS'
];

export const startAutoPilotService = () => {
    console.log('🚀 EquiTrade AI Pilot: Money Manager Mode Engaged');
    
    // Run every 3 minutes during market hours
    setInterval(async () => {
        try {
            if (!isMarketOpen()) return;

            const users = await prisma.user.findMany({
                where: { 
                    OR: [
                        { autoPilotMock: true },
                        { autoPilotLive: true }
                    ]
                }
            });

            for (const user of users) {
                if (user.autoPilotMock) await manageUserWealth(user, 'mock');
                if (user.autoPilotLive) await manageUserWealth(user, 'live');
            }
            
            // Reconcile settled funds
            await releaseSettledFunds();
        } catch (error) {
            console.error('AI Manager Error:', error.message);
        }
    }, 3 * 60 * 1000); 
};

export const releaseSettledFunds = async () => {
    const now = new Date();
    try {
        const pending = await prisma.settlementEntry.findMany({
            where: { status: 'PENDING', releaseDate: { lte: now } }
        });

        for (const entry of pending) {
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: entry.userId },
                    data: { 
                        mockBalance: { increment: entry.amount },
                        settlementBalance: { decrement: entry.amount }
                    }
                }),
                prisma.settlementEntry.update({
                    where: { id: entry.id },
                    data: { status: 'RELEASED' }
                })
            ]);
            console.log(`[Settlement] Released ₹${entry.amount.toLocaleString()} to user ${entry.userId}`);
        }
    } catch (e) {
        console.error('[Settlement] Error:', e.message);
    }
};

import { analyzeStock } from '../utils/analysis.js';

async function manageUserWealth(user, mode) {
    try {
        if (mode === 'live' && !user.brokerAccess) return;

        // 1. DYNAMIC PORTFOLIO EVALUATION (Technical Signal-based Exit)
        const portfolio = await prisma.portfolioItem.findMany({
            where: { userId: user.id },
            include: { stock: true }
        });

        for (const item of portfolio) {
            try {
                // Fetch historical data for technical analysis
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 60); // 60 days for reliable indicators

                const historyRaw = await yahooFinance.chart(item.stock.symbol, {
                    period1: startDate.toISOString().split('T')[0],
                    interval: '1d'
                }).catch(() => null);

                const history = historyRaw?.quotes?.map(q => ({
                    date: q.date,
                    open: q.open,
                    high: q.high,
                    low: q.low,
                    close: q.close,
                    volume: q.volume
                })) || [];

                if (history.length < 10) continue;

                const analysis = analyzeStock(history);
                const currentPrice = analysis.currentPrice;
                const pnlPercent = ((currentPrice * item.quantity - item.totalCost) / item.totalCost) * 100;

                // IMPROVED EXIT LOGIC: Signal-Based + Safety Nets
                const shouldSell = 
                    (analysis.signal.includes('SELL') && pnlPercent > 1.0) || // Take profit if signal turns bearish
                    (analysis.signal === 'STRONG SELL') || // Exit immediately on crash warning
                    (pnlPercent > 15.0) || // Hard profit target
                    (pnlPercent < -4.0); // Hard stop loss (tightened from -5%)

                if (shouldSell) {
                    const exitReason = analysis.signal.includes('SELL') 
                        ? `Technical Reversal: ${item.stock.symbol} generated a ${analysis.signal} signal. Current P&L: ${pnlPercent.toFixed(2)}%.`
                        : `Risk Protocol: Automated exit triggered at ${pnlPercent.toFixed(2)}% to preserve capital.`;
                    
                    await executeAutoTrade(user, item.stock.symbol, item.quantity, currentPrice, 'SELL', exitReason, mode);
                    continue;
                }
            } catch (err) {
                console.error(`[AI-PILOT] Analysis fail for ${item.stock.symbol}:`, err.message);
            }
        }

        // 2. INTELLIGENT ASSET ACQUISITION (Multi-Factor Scoring)
        const totalInvested = portfolio.reduce((sum, item) => sum + item.totalCost, 0);
        const userBalance = mode === 'mock' ? user.mockBalance : (user.pilotLimitLive || 50000); 
        const pilotLimit = mode === 'mock' ? user.pilotLimitMock : user.pilotLimitLive;
        
        let currentBalanceAvailableToAI;
        if (pilotLimit) {
            currentBalanceAvailableToAI = Math.min(userBalance, Math.max(0, pilotLimit - totalInvested));
        } else {
            currentBalanceAvailableToAI = userBalance;
        }

        if (portfolio.length < 10 && currentBalanceAvailableToAI > 2000) {
            const candidate = await findSophisticatedCandidate(user);
            if (candidate && !portfolio.find(p => p.stock.symbol === candidate.symbol)) {
                const quote = await yahooFinance.quote(candidate.symbol);
                const price = quote.regularMarketPrice;
                
                const totalBudget = pilotLimit || (userBalance + totalInvested);
                const allocationPerStock = totalBudget * 0.15; 
                
                const amountToInvest = Math.min(allocationPerStock, currentBalanceAvailableToAI, 200000); 
                const qty = Math.floor(amountToInvest / price);

                if (qty > 0) {
                    await executeAutoTrade(user, candidate.symbol, qty, price, 'BUY', `Alpha Generation: ${candidate.reason}`, mode);
                }
            }
        }

    } catch (e) {
        console.error(`AI Manager User Logic Fail (${user.id}):`, e.message);
    }
}

async function findSophisticatedCandidate(user) {
    const watchlist = await prisma.watchlist.findMany({
        where: { userId: user.id },
        include: { stock: true }
    });

    const pool = watchlist.length > 5 ? watchlist.map(w => w.stock.symbol) : [...new Set([...watchlist.map(w => w.stock.symbol), ...TARGET_STOCKS])];
    
    try {
        const scanPool = pool.slice(0, 20);
        const candidates = [];

        for (const symbol of scanPool) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 45);

            const historyRaw = await yahooFinance.chart(symbol, {
                period1: startDate.toISOString().split('T')[0],
                interval: '1d'
            }).catch(() => null);

            if (!historyRaw?.quotes || historyRaw.quotes.length < 15) continue;

            const history = historyRaw.quotes.map(q => ({
                date: q.date, open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume
            }));

            const analysis = analyzeStock(history);
            if (analysis.signal === 'STRONG BUY' || (analysis.signal === 'BUY' && analysis.score > 25)) {
                candidates.push({
                    symbol,
                    score: analysis.score,
                    reason: `High conviction entry in ${symbol} (Score: ${analysis.score}). ${analysis.reasoning[0] || 'Bullish technical alignment.'}`
                });
            }
        }

        if (candidates.length > 0) {
            return candidates.sort((a, b) => b.score - a.score)[0];
        }
    } catch (e) {
        console.error('[AI-PILOT] Sophisticated scan failed:', e.message);
    }
    return null;
}

async function executeAutoTrade(user, symbol, quantity, price, action, reason, mode) {
    const totalAmount = quantity * price;

    try {
        let liveResult = null;
        if (mode === 'live') {
            console.log(`[AI-PILOT] Executing LIVE ${action} for ${symbol}...`);
            liveResult = await executeLiveTrade(user, symbol, quantity, action);
            if (!liveResult.success) {
                console.error(`[AI-PILOT] LIVE TRADE FAILED: ${liveResult.error}`);
                return;
            }
        }

        // Update DB to reflect the trade (both for Mock and for tracking Live intent)
        let stock = await prisma.stock.findUnique({ where: { symbol } });
        if (!stock) stock = await prisma.stock.create({ data: { symbol } });

        await prisma.$transaction(async (tx) => {
            if (action === 'BUY') {
                await tx.portfolioItem.upsert({
                    where: { userId_stockId: { userId: user.id, stockId: stock.id } },
                    update: {
                        quantity: { increment: quantity },
                        totalCost: { increment: totalAmount },
                        avgPrice: { set: 0 } 
                    },
                    create: {
                        userId: user.id,
                        stockId: stock.id,
                        quantity,
                        avgPrice: price,
                        totalCost: totalAmount
                    }
                });
            } else {
                const item = await tx.portfolioItem.findUnique({
                    where: { userId_stockId: { userId: user.id, stockId: stock.id } }
                });

                if (item) {
                    const costToDeduct = (item.totalCost / item.quantity) * quantity;
                    if (item.quantity <= quantity) {
                        await tx.portfolioItem.delete({ where: { id: item.id } });
                    } else {
                        await tx.portfolioItem.update({
                            where: { id: item.id },
                            data: {
                                quantity: { decrement: quantity },
                                totalCost: { decrement: costToDeduct }
                            }
                        });
                    }
                }
            }

            await tx.tradeLog.create({
                data: {
                    userId: user.id,
                    symbol,
                    action,
                    quantity,
                    price,
                    totalAmount,
                    mode: 'AI_PILOT',
                    strategyName: 'AI Pilot: Dynamic Wealth Management',
                    type: mode.toUpperCase(),
                    reason: mode === 'live' ? `[LIVE ORDER: ${liveResult?.orderId || 'PENDING'}] ${reason}` : reason
                }
            });

            // Update user balance if mock
            if (mode === 'mock') {
                if (action === 'BUY') {
                    await tx.user.update({
                        where: { id: user.id },
                        data: { mockBalance: { decrement: totalAmount } }
                    });
                } else {
                    // SELL logic with T+1 Settlement (100% delay for realism)
                    const releaseDate = new Date();
                    releaseDate.setDate(releaseDate.getDate() + 1);
                    releaseDate.setHours(9, 15, 0, 0); // 9:15 AM next day
                    
                    // Skip weekends
                    if (releaseDate.getDay() === 6) releaseDate.setDate(releaseDate.getDate() + 2); // Fri -> Sun -> Mon
                    if (releaseDate.getDay() === 0) releaseDate.setDate(releaseDate.getDate() + 1); // Sat -> Mon
                    
                    await tx.user.update({
                        where: { id: user.id },
                        data: { 
                            settlementBalance: { increment: totalAmount }
                        }
                    });

                    await tx.settlementEntry.create({
                        data: {
                            userId: user.id,
                            amount: totalAmount,
                            releaseDate: releaseDate
                        }
                    });
                }
            }
        });
        
        console.log(`[AI-PILOT] ${mode.toUpperCase()} ${action} SUCCESS: ${symbol} | Price: ₹${price}`);
    } catch (e) {
        console.error(`AI Execution Fail (${symbol}):`, e.message);
    }
}
