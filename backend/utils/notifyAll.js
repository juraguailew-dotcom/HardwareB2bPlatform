// backend/utils/notifyAll.js
const pool   = require('../database/db');
const notify = require('./notify');
const { sendEmail } = require('./email');
const { sendSms }   = require('./sms');
const CURRENCY = require('../config/currency');

/**
 * Fire in-app + email + SMS for a given notification event.
 *
 * @param {number}  userId        - recipient user id
 * @param {object}  inApp         - { type, title, message, referenceId, referenceType }
 * @param {object}  emailPayload  - { subject, html }
 * @param {string}  smsBody       - plain-text SMS body (kept ≤160 chars)
 */
const notifyAll = async (userId, inApp, emailPayload, smsBody) => {
    // 1. In-app notification (always)
    await notify(
        userId,
        inApp.type,
        inApp.title,
        inApp.message,
        inApp.referenceId   ?? null,
        inApp.referenceType ?? null
    );

    // 2. Fetch user contact details + preferences
    const { rows } = await pool.query(
        'SELECT email, phone, notify_email, notify_sms FROM users WHERE id = $1',
        [userId]
    );
    if (!rows.length) return;
    const { email, phone, notify_email, notify_sms } = rows[0];

    // 3. Email (opt-in defaults to true)
    if (notify_email !== false && emailPayload) {
        await sendEmail(email, emailPayload.subject, emailPayload.html);
    }

    // 4. SMS (opt-in defaults to true)
    if (notify_sms !== false && smsBody && phone) {
        await sendSms(phone, smsBody);
    }
};

// ─── Pre-built event helpers ──────────────────────────────────────────────────

const notifyNewOrder = (shopId, orderId, totalAmount, requiresApproval) =>
    notifyAll(
        shopId,
        {
            type: 'NEW_ORDER',
            title: 'New Order Received',
            message: `Order #${orderId} worth ${CURRENCY.format(totalAmount)} received${requiresApproval ? ' — approval required' : ''}.`,
            referenceId: orderId,
            referenceType: 'order',
        },
        {
            subject: `New Order #${orderId} — HardwareB2B`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto">
                    <h2 style="color:#1d4ed8">New Order Received</h2>
                    <p>Order <strong>#${orderId}</strong> worth <strong>${CURRENCY.format(totalAmount)}</strong> has been placed on your shop.</p>
                    ${requiresApproval ? '<p style="color:#d97706"><strong>This order requires your approval before processing.</strong></p>' : ''}
                    <p>Log in to your dashboard to review and fulfil the order.</p>
                </div>`,
        },
        `HardwareB2B: New order #${orderId} (${CURRENCY.format(totalAmount)})${requiresApproval ? ' — approval needed' : ''}. Login to review.`
    );

const notifyOrderStatus = (contractorId, orderId, status) =>
    notifyAll(
        contractorId,
        {
            type: 'ORDER_STATUS',
            title: 'Order Status Updated',
            message: `Your order #${orderId} is now "${status}".`,
            referenceId: orderId,
            referenceType: 'order',
        },
        {
            subject: `Order #${orderId} is now ${status} — HardwareB2B`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto">
                    <h2 style="color:#1d4ed8">Order Status Updated</h2>
                    <p>Your order <strong>#${orderId}</strong> has been updated to <strong>${status}</strong>.</p>
                </div>`,
        },
        `HardwareB2B: Order #${orderId} is now "${status}".`
    );

const notifyOrderApproval = (contractorId, orderId, approved, notes) =>
    notifyAll(
        contractorId,
        {
            type: 'ORDER_APPROVAL',
            title: `Order ${approved ? 'Approved' : 'Rejected'}`,
            message: `Your order #${orderId} has been ${approved ? 'approved' : 'rejected'}. ${notes || ''}`,
            referenceId: orderId,
            referenceType: 'order',
        },
        {
            subject: `Order #${orderId} ${approved ? 'Approved' : 'Rejected'} — HardwareB2B`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto">
                    <h2 style="color:${approved ? '#16a34a' : '#dc2626'}">${approved ? 'Order Approved' : 'Order Rejected'}</h2>
                    <p>Your order <strong>#${orderId}</strong> has been <strong>${approved ? 'approved and is now being processed' : 'rejected'}</strong>.</p>
                    ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                </div>`,
        },
        `HardwareB2B: Order #${orderId} has been ${approved ? 'approved' : 'rejected'}.${notes ? ' ' + notes : ''}`
    );

const notifyVerification = (userId, companyName, verified) =>
    notifyAll(
        userId,
        {
            type: 'ACCOUNT_VERIFIED',
            title: verified ? 'Account Verified' : 'Account Unverified',
            message: verified
                ? 'Your account has been verified. You now have full platform access.'
                : 'Your account verification has been removed. Contact support for assistance.',
        },
        {
            subject: verified ? 'Your HardwareB2B Account is Verified' : 'HardwareB2B Account Update',
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto">
                    <h2 style="color:${verified ? '#16a34a' : '#d97706'}">${verified ? '✅ Account Verified' : 'Account Update'}</h2>
                    <p>Hi <strong>${companyName}</strong>,</p>
                    <p>${verified
                        ? 'Your account has been verified by our team. You now have full access to the HardwareB2B platform.'
                        : 'Your account verification status has been updated. Please contact support if you have questions.'
                    }</p>
                </div>`,
        },
        `HardwareB2B: ${companyName}, your account has been ${verified ? 'verified — you now have full access' : 'unverified. Contact support'}.`
    );

const notifyDisputeUpdate = (userId, disputeId, status, notes) =>
    notifyAll(
        userId,
        {
            type: 'DISPUTE_UPDATE',
            title: 'Dispute Update',
            message: `Dispute #${disputeId} is now "${status}".${notes ? ' ' + notes : ''}`,
            referenceId: disputeId,
            referenceType: 'dispute',
        },
        {
            subject: `Dispute #${disputeId} Update — HardwareB2B`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto">
                    <h2 style="color:#d97706">Dispute Update</h2>
                    <p>Dispute <strong>#${disputeId}</strong> has been updated to <strong>${status}</strong>.</p>
                    ${notes ? `<p><strong>Resolution notes:</strong> ${notes}</p>` : ''}
                </div>`,
        },
        `HardwareB2B: Dispute #${disputeId} updated to "${status}".${notes ? ' ' + notes : ''}`
    );

module.exports = {
    notifyAll,
    notifyNewOrder,
    notifyOrderStatus,
    notifyOrderApproval,
    notifyVerification,
    notifyDisputeUpdate,
};
