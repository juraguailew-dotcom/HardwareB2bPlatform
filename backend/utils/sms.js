// backend/utils/sms.js
const twilio = require('twilio');

const client =
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        : null;

const sendSms = async (to, body) => {
    if (!client || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn('SMS not configured — skipping send to:', to);
        return;
    }
    if (!to) return;
    try {
        // Normalise PNG numbers: 7xxxxxxx → +6757xxxxxxx
        const normalised = to.startsWith('+') ? to : `+675${to.replace(/^0/, '')}`;
        await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: normalised,
            body,
        });
    } catch (err) {
        console.error('SMS send error:', err.message);
    }
};

module.exports = { sendSms };
