import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise}
 */
export const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"EquiSense Intelligence" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[EmailService] Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('[EmailService] Error:', error.message);
        throw error;
    }
};
