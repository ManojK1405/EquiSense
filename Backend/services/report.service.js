import prisma from '../utils/prisma.js';
import cron from 'node-cron';
import { isTradingDay } from '../utils/marketStatus.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const startReportService = () => {
    // Run at 5:00 PM IST every day
    // cron format: minute hour day-of-month month day-of-week
    // 5:00 PM is 17:00
    // We assume the server is running in UTC or IST. If UTC, 5:00 PM IST is 11:30 AM UTC.
    // However, node-cron often respects the system timezone. 
    // Let's use a pattern that runs every hour to check, or just assume system is IST if user is in India.
    // Given the metadata says local time is 01:07 AM (IST), the system seems to be in IST.
    
    cron.schedule('0 17 * * *', async () => {
        console.log('--- Generating Daily Investment Briefings ---');
        await generateAllDailyReports();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};

export const generateAllDailyReports = async () => {
    try {
        const users = await prisma.user.findMany();
        const isTodayTradingDay = isTradingDay();

        for (const user of users) {
            await generateUserDailyReport(user, isTodayTradingDay);
        }
        console.log('--- Daily Briefings Generation Complete ---');
    } catch (error) {
        console.error('[ReportService] Global Error:', error.message);
    }
};

async function generateUserDailyReport(user, isTradingDay) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
        if (!isTradingDay) {
            await prisma.dailyReport.create({
                data: {
                    userId: user.id,
                    marketStatus: 'CLOSED',
                    summary: 'Market Closed Today',
                    analysis: 'The Indian stock exchanges (NSE/BSE) were closed today. No automated or manual trades were processed. The AI Pilot remained in dormant observation mode.',
                    date: new Date()
                }
            });
            return;
        }

        // Fetch trades for today
        const trades = await prisma.tradeLog.findMany({
            where: {
                userId: user.id,
                timestamp: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        const portfolio = await prisma.portfolioItem.findMany({
            where: { userId: user.id },
            include: { stock: true }
        });

        if (trades.length === 0) {
            await prisma.dailyReport.create({
                data: {
                    userId: user.id,
                    marketStatus: 'OPEN',
                    summary: 'Observation Mode: No Trades Executed',
                    analysis: 'The market was active today, but no stocks in your watchlist or the broader market pool met the AI Pilot\'s strict momentum and risk-adjusted entry criteria. Your current portfolio remains stable with no exits triggered.',
                    date: new Date()
                }
            });
            return;
        }

        // Generate AI Analysis for trades
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const tradeSummary = trades.map(t => `${t.action} ${t.quantity} shares of ${t.symbol} at ₹${t.price} (Reason: ${t.reason})`).join('\n');
        
        const prompt = `
            You are an institutional investment strategist.
            Generate a concise "Daily Investment Brief" for a user based on their activity today.
            
            Activity:
            ${tradeSummary}
            
            Context:
            - User's Portfolio has ${portfolio.length} active positions.
            - Total trades today: ${trades.length}
            
            Format:
            - Summary: A 1-sentence high-level executive summary of the day's posture.
            - Analysis: A 3-4 sentence detailed professional explanation of why these moves were made (mention momentum, risk management, and profit booking if applicable based on the reasons provided). Use a premium, institutional tone.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response.text();
        
        // Parse "Summary:" and "Analysis:" from the response
        const summaryMatch = response.match(/Summary:\s*(.*)/i);
        const analysisMatch = response.match(/Analysis:\s*([\s\S]*)/i);
        
        const summary = summaryMatch ? summaryMatch[1].trim() : "Daily activity report processed.";
        const analysis = analysisMatch ? analysisMatch[1].trim() : response;

        await prisma.dailyReport.create({
            data: {
                userId: user.id,
                marketStatus: 'OPEN',
                summary,
                analysis,
                date: new Date()
            }
        });

    } catch (e) {
        console.error(`[ReportService] Fail for user ${user.id}:`, e.message);
    }
}
