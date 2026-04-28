import prisma from '../utils/prisma.js';
import cron from 'node-cron';
import { getMarketSummaryData } from './market.service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Newsletter Service
 * Handles automated dispatch of the Intelligence Brief
 */
export const startNewsletterService = () => {
    // Run at 8:00 AM IST every day (before market open)
    // 8:00 AM IST is 02:30 AM UTC
    cron.schedule('0 8 * * *', async () => {
        console.log('--- [NewsletterService] Dispatching Daily Intelligence Brief ---');
        try {
            await dispatchIntelligenceBrief();
        } catch (error) {
            console.error('[NewsletterService] Dispatch Error:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};

export const dispatchIntelligenceBrief = async () => {
    try {
        // 1. Fetch Latest Market Intelligence
        const marketData = await getMarketSummaryData();
        const activeSubscribers = await prisma.newsletterSubscription.findMany({
            where: { isActive: true }
        });

        if (activeSubscribers.length === 0) {
            console.log('[NewsletterService] No active subscribers found. Skipping dispatch.');
            return;
        }

        // 2. Use AI to craft the briefing
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const newsTitles = marketData.topNews?.map(n => n.title).join('\n') || 'No major news reported.';
        const pulseSummary = marketData.pulse?.map(p => `${p.name}: ₹${p.price} (${p.changePercent.toFixed(2)}%)`).join(', ') || 'Market data unavailable.';
        
        const prompt = `
            You are a senior financial analyst at EquiSense. 
            Craft a premium, concise "Intelligence Brief" for institutional and retail investors.
            
            Current Market Context:
            - Indices: ${pulseSummary}
            - Latest News: 
            ${newsTitles}
            
            Structure:
            - Subject: A punchy, market-focused headline.
            - Briefing: A 3-4 sentence professional summary of the current market mood, key drivers, and what to watch for today. 
            - Actionable Insight: 1 sentence on a sector or theme showing high-conviction potential.
            
            Tone: Institutional, calm, and insightful. Avoid fluff.
        `;

        const result = await model.generateContent(prompt);
        const aiResponse = await result.response.text();

        // 3. Prepare the payload
        const brief = {
            timestamp: new Date().toISOString(),
            content: aiResponse,
            marketPulse: marketData.pulse,
            topNews: marketData.topNews
        };

        // 4. Dispatch (Mocking email sending with logs for now, but ready for Nodemailer integration)
        console.log(`[NewsletterService] Sending Intelligence Brief to ${activeSubscribers.length} users.`);
        console.log(`[NewsletterService] CONTENT PREVIEW:\n${aiResponse}`);

        // Note: In a production environment, you would use a queue (BullMQ/Redis) 
        // and a service like Resend or AWS SES here.
        
        return brief;
    } catch (error) {
        console.error('[NewsletterService] Dispatch Internal Error:', error.message);
        throw error;
    }
};
