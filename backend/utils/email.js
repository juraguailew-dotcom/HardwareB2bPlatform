// backend/utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const FROM = `"HardwareB2B PNG" <${process.env.EMAIL_USER}>`;

const sendEmail = async (to, subject, html) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email not configured — skipping send to:', to);
        return;
    }
    try {
        await transporter.sendMail({ from: FROM, to, subject, html });
    } catch (err) {
        console.error('Email send error:', err.message);
    }
};

const sendPasswordReset = (to, resetUrl) =>
    sendEmail(to, 'Reset Your HardwareB2B Password', `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#1d4ed8">Password Reset Request</h2>
            <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
                Reset Password
            </a>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">If you did not request this, ignore this email.</p>
        </div>
    `);

const sendOrderConfirmation = (to, order) =>
    sendEmail(to, `Order #${order.id} Confirmed — HardwareB2B`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#16a34a">Order Confirmed</h2>
            <p>Your order <strong>#${order.id}</strong> worth <strong>K${parseFloat(order.total_amount).toFixed(2)}</strong> has been placed successfully.</p>
            <p>You will be notified when the shop confirms and ships your order.</p>
        </div>
    `);

const sendOrderStatusUpdate = (to, orderId, status) =>
    sendEmail(to, `Order #${orderId} Status Update — HardwareB2B`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#1d4ed8">Order Status Updated</h2>
            <p>Your order <strong>#${orderId}</strong> status has been updated to <strong>${status}</strong>.</p>
        </div>
    `);

const sendDisputeUpdate = (to, disputeId, status, notes) =>
    sendEmail(to, `Dispute #${disputeId} Update — HardwareB2B`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#d97706">Dispute Update</h2>
            <p>Dispute <strong>#${disputeId}</strong> has been updated to <strong>${status}</strong>.</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>
    `);

module.exports = { sendEmail, sendPasswordReset, sendOrderConfirmation, sendOrderStatusUpdate, sendDisputeUpdate };
