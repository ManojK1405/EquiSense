import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { getMarketSummaryData } from '../services/market.service.js';

/**
 * Newsletter Controller
 */
export const subscribe = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });
        if (existing) {
            if (existing.isActive) {
                return res.status(400).json({ message: 'Email is already subscribed' });
            }
            await prisma.newsletterSubscription.update({
                where: { email },
                data: { isActive: true }
            });
        } else {
            await prisma.newsletterSubscription.create({ data: { email } });
        }
        res.status(200).json({ message: 'Subscribed successfully' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const unsubscribe = async (req, res) => {
    const { email } = req.body;
    try {
        await prisma.newsletterSubscription.update({
            where: { email },
            data: { isActive: false }
        });
        res.status(200).json({ message: 'Unsubscribed successfully' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const checkStatus = async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    try {
        const sub = await prisma.newsletterSubscription.findUnique({ where: { email } });
        res.status(200).json({ subscribed: sub ? sub.isActive : false });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const sendNewsletter = async (req, res) => {
    try {
        // 1. Fetch data for the newsletter
        const marketSummary = await getMarketSummaryData();
        
        // 2. Get active subscribers
        const subscribers = await prisma.newsletterSubscription.findMany({ where: { isActive: true } });
        
        const newsletterContent = {
            subject: `EquiSense Intelligence Brief - ${new Date().toLocaleDateString()}`,
            headline: "Institutional Analysis & Market Momentum",
            marketPulse: marketSummary.pulse?.slice(0, 3).map(p => `${p.name}: ₹${p.price} (${p.changePercent > 0 ? '+' : ''}${p.changePercent.toFixed(2)}%)`) || [],
            topAnalysis: "Our AI systems have detected unusual institutional accumulation in the IT sector. Momentum indicators suggest a potential breakout in high-beta names.",
            latestNews: marketSummary.topNews?.slice(0, 5).map(n => n.title) || []
        };

        // 3. "Send" the newsletter (mocking for now)
        console.log(`[NEWSLETTER] Blasting to ${subscribers.length} subscribers...`);
        console.log("Content:", JSON.stringify(newsletterContent, null, 2));

        res.status(200).json({ 
            message: `Newsletter sent to ${subscribers.length} subscribers`,
            preview: newsletterContent
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};
