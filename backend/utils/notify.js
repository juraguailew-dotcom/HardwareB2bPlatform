// backend/utils/notify.js
const pool = require('../database/db');

const notify = async (userId, type, title, message, referenceId = null, referenceType = null) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, type, title, message, referenceId, referenceType]
        );
    } catch (err) {
        console.error('Notification error:', err.message);
    }
};

module.exports = notify;
