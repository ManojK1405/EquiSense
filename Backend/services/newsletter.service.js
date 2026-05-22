import prisma from '../utils/prisma.js';
import cron from 'node-cron';
import { getMarketSummaryData } from './market.service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendEmail } from '../utils/email.js';

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
        
        // Fetch only active newsletter subscribers
        const newsletterSubs = await prisma.newsletterSubscription.findMany({
            where: { isActive: true },
            select: { email: true }
        });

        // Use only subscriber emails
        const allEmails = newsletterSubs.map(s => s.email).filter(email => email && email.includes('@'));

        if (allEmails.length === 0) {
            console.log('[NewsletterService] No recipients found. Skipping dispatch.');
            return;
        }

        // 2. Use AI to craft the briefing (What to expect)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const newsTitles = marketData.topNews?.map(n => n.title).join('\n') || 'No major news reported.';
        const pulseSummary = marketData.pulse?.map(p => `${p.name}: ₹${p.price} (${p.changePercent.toFixed(2)}%)`).join(', ') || 'Market data unavailable.';
        const globalSummary = marketData.globalIndices?.map(g => `${g.name} (${g.changePercent.toFixed(2)}%)`).join(', ') || 'Global data unavailable.';
        
        const prompt = `
            You are a senior financial analyst at EquiSense Intelligence. 
            Craft a premium, concise "Daily Market Outlook" for the Indian stock market open today.
            
            Market Context:
            - Indian Indices Pulse: ${pulseSummary}
            - Global Market Sentiment: ${globalSummary}
            - Latest Headlines: 
            ${newsTitles}
            
            Structure your response in clear sections:
            1. WHAT TO EXPECT: A 3-4 sentence professional analysis of how the market is likely to open and trade today based on global cues and recent news.
            2. KEY DRIVERS: 2-3 bullet points on specific stocks or sectors that will be in focus today.
            3. TRADING STANCE: A 1-sentence recommendation on the overall market mood (e.g., Cautious, Bullish, Range-bound).
            
            Tone: Institutional, data-driven, and authoritative. Do not use generic filler.
        `;

        const result = await model.generateContent(prompt);
        const aiResponse = await result.response.text();

        // 3. Prepare HTML Content
        const subject = `EquiSense Intelligence Brief: Market Outlook - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        
        const newsHtml = marketData.topNews?.map(n => `
            <div style="margin-bottom: 15px; padding: 12px; border-radius: 8px; background: #1a1a1a; border-left: 3px solid #ff6b6b;">
                <h4 style="margin: 0 0 5px; color: #ffffff; font-size: 14px; line-height: 1.4;">${n.title}</h4>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888;">
                    <span>${n.publisher}</span>
                    <a href="${n.link}" style="color: #ff6b6b; text-decoration: none;">Read More &rarr;</a>
                </div>
            </div>
        `).join('') || '<p style="color: #888;">No major headlines today.</p>';

        const pulseHtml = marketData.pulse?.map(p => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; font-size: 13px;">
                <span style="color: #ccc; font-weight: 600;">${p.name}</span>
                <span style="color: ${p.changePercent >= 0 ? '#10b981' : '#f43f5e'}; font-weight: 700;">
                    ₹${p.price.toLocaleString()} (${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(2)}%)
                </span>
            </div>
        `).join('') || '';

        const htmlContent = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0c0c0c; color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #333;">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 30px; text-align: center; border-bottom: 2px solid #ff6b6b;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">EquiSense Intelligence</h1>
                    <p style="margin: 5px 0 0; color: #ff6b6b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Daily Market Briefing</p>
                </div>
                
                <div style="padding: 30px;">
                    <!-- AI Outlook -->
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #ff6b6b; font-size: 16px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px;">Market Outlook</h3>
                        <div style="color: #e2e8f0; line-height: 1.7; font-size: 15px;">
                            ${aiResponse.split('\n').map(line => line.trim() ? `<p style="margin-bottom: 12px;">${line}</p>` : '').join('')}
                        </div>
                    </div>

                    <!-- Market Pulse -->
                    <div style="margin-bottom: 30px; background: #111; padding: 20px; border-radius: 12px; border: 1px solid #222;">
                        <h3 style="color: #ffffff; font-size: 14px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px;">Indices Performance</h3>
                        ${pulseHtml}
                    </div>

                    <!-- Top News -->
                    <div>
                        <h3 style="color: #ff6b6b; font-size: 16px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px;">Top Market Headlines</h3>
                        ${newsHtml}
                    </div>

                    <!-- Footer -->
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; text-align: center;">
                        <p style="font-size: 11px; color: #666; line-height: 1.6;">
                            This brief is generated by EquiSense AI for institutional insights.<br/>
                            Investment in securities market are subject to market risks. Read all the related documents carefully before investing.
                        </p>
                        <div style="margin-top: 15px; font-size: 11px;">
                            <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #888; text-decoration: none; margin: 0 10px;">Dashboard</a>
                            <a href="${process.env.FRONTEND_URL}/settings" style="color: #888; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 4. Dispatch to all recipients
        console.log(`[NewsletterService] Dispatching to ${allEmails.length} recipients...`);
        
        const dispatchPromises = allEmails.map(email => 
            sendEmail(email, subject, htmlContent).catch(err => {
                console.error(`[NewsletterService] Failed for ${email}:`, err.message);
            })
        );

        await Promise.all(dispatchPromises);
        console.log('[NewsletterService] Dispatch complete.');
        
        return { success: true, count: allEmails.length };
    } catch (error) {
        console.error('[NewsletterService] Dispatch Internal Error:', error.message);
        throw error;
    }
};
