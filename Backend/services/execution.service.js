import prisma from '../utils/prisma.js';
import YahooFinance from 'yahoo-finance2';
import { isMarketOpen } from '../utils/marketStatus.js';
import { getAIStrategy } from '../utils/gemini.js';

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

export const executeStrategyDeployment = async (userId, amount, mode) => {
    const investAmount = parseFloat(amount);

    // 1. Generate Intelligent Portfolio using Gemini
    const prompt = `
        Persona: Institutional Fund Manager.
        Objective: Construct a high-conviction, diversified portfolio of exactly 3-5 liquid Indian equity tickers for immediate deployment.
        
        Mandate: 
        - Total Capital: ₹${investAmount}
        - Risk Tolerance: Moderate
        - Sector Focus: Multi-Cap
        
        Output:
        - Return a JSON object with a "trades" array.
        - Each trade must have: "name" (symbol with .NS), "amount" (allocation in ₹), "reason" (short institutional logic).
        - Ensure total allocation sums to exactly ₹${investAmount}.
    `;

    const rawStrategy = await getAIStrategy(prompt);
    const parsed = JSON.parse(rawStrategy);
    const trades = parsed.trades || [];

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

    for (const pt of preparedTrades) {
        let stock = await prisma.stock.findUnique({ where: { symbol: pt.symbol } });
        if (!stock) stock = await prisma.stock.create({ data: { symbol: pt.symbol } });
        pt.stockId = stock.id;
    }

    if (!isMarketOpen()) {
        const updateData = { tradingMode: mode };
        if (mode === 'live') {
            updateData.autoPilotLive = true;
            updateData.pilotLimitLive = investAmount;
        } else {
            updateData.autoPilotMock = true;
            updateData.pilotLimitMock = investAmount;
        }

        await prisma.$transaction([
            prisma.user.update({ where: { id: userId }, data: updateData }),
            prisma.queuedTrade.create({
                data: {
                    userId: userId,
                    trades: preparedTrades.map(t => ({ ...t, action: 'BUY' })),
                    status: 'PENDING',
                    brokerType: mode === 'live' ? 'zerodha' : 'mock'
                }
            })
        ]);

        return {
            success: true,
            message: `Market closed. ₹${totalActualSpent} queued for open.`,
            trades: preparedTrades
        };
    }

    await prisma.$transaction(async (tx) => {
        const updateData = { tradingMode: mode };
        if (mode === 'live') {
            updateData.autoPilotLive = true;
            updateData.pilotLimitLive = investAmount;
        } else {
            updateData.autoPilotMock = true;
            updateData.pilotLimitMock = investAmount;
            updateData.mockBalance = { decrement: totalActualSpent };
        }

        await tx.user.update({ where: { id: userId }, data: updateData });

        for (const pt of preparedTrades) {
            await tx.portfolioItem.upsert({
                where: { userId_stockId: { userId: userId, stockId: pt.stockId } },
                update: {
                    quantity: { increment: pt.quantity },
                    totalCost: { increment: pt.actualAmount },
                    avgPrice: { set: 0 }
                },
                create: {
                    userId: userId,
                    stockId: pt.stockId,
                    quantity: pt.quantity,
                    avgPrice: pt.price,
                    totalCost: pt.actualAmount
                }
            });

            await tx.tradeLog.create({
                data: {
                    userId: userId,
                    symbol: pt.symbol,
                    action: 'BUY',
                    quantity: pt.quantity,
                    price: pt.price,
                    totalAmount: pt.actualAmount,
                    type: mode.toUpperCase(),
                    mode: 'AI_AGENT',
                    strategyName: 'AI Agent Deployment',
                    reason: pt.reason
                }
            });
        }
    });

    return {
        success: true,
        message: `Successfully deployed ₹${totalActualSpent} in ${mode} mode.`,
        trades: preparedTrades
    };
};
