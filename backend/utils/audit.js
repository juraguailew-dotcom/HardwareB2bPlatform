// backend/utils/audit.js
const pool = require('../database/db');

const auditLog = async (userId, action, entityType, entityId, details, ipAddress) => {
    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, action, entityType, entityId, JSON.stringify(details), ipAddress]
        );
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
};

module.exports = auditLog;
