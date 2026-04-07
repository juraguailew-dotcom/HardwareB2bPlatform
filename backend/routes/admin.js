// backend/routes/admin.js
const express = require('express');
const pool = require('../database/db');
const { authenticateToken, doubleCsrfProtection } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const { notifyVerification, notifyDisputeUpdate } = require('../utils/notifyAll');

const router = express.Router();

// ==================== ADMIN PROFILE ====================
router.get('/profile', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT company_name AS "fullName", email, user_type AS role, created_at AS "lastLogin"
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Admin profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// ==================== DASHBOARD STATS ====================
router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
    try {
        const userStats = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN user_type = 'shop' THEN 1 END) as total_shops,
                COUNT(CASE WHEN user_type = 'contractor' THEN 1 END) as total_contractors,
                COUNT(CASE WHEN verified = false THEN 1 END) as pending_verification,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week
            FROM users
        `);

        const requestStats = await pool.query(`
            SELECT 
                COUNT(*) as total_requests,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_requests,
                COUNT(CASE WHEN request_date >= NOW() - INTERVAL '7 days' THEN 1 END) as requests_week
            FROM requests
        `);

        const disputeStats = await pool.query(`
            SELECT 
                COUNT(*) as total_disputes,
                COUNT(CASE WHEN status = 'open' THEN 1 END) as open_disputes,
                COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating
            FROM disputes
        `);

        const recentActivity = await pool.query(`
            (SELECT 'user' as type, id, company_name as title, created_at 
             FROM users ORDER BY created_at DESC LIMIT 5)
            UNION ALL
            (SELECT 'request' as type, id, 'Request #' || id as title, request_date as created_at 
             FROM requests ORDER BY request_date DESC LIMIT 5)
            UNION ALL
            (SELECT 'dispute' as type, id, 'Dispute #' || id as title, created_at 
             FROM disputes ORDER BY created_at DESC LIMIT 5)
            ORDER BY created_at DESC LIMIT 10
        `);

        res.json({
            users: userStats.rows[0],
            requests: requestStats.rows[0],
            disputes: disputeStats.rows[0],
            recentActivity: recentActivity.rows
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// ==================== USER MANAGEMENT ====================

router.get('/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { type, verified, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                id, email, user_type, company_name, phone, address,
                tax_id, verified, created_at,
                CASE 
                    WHEN user_type = 'shop' THEN (SELECT COUNT(*) FROM requests WHERE shop_id = users.id)
                    ELSE (SELECT COUNT(*) FROM requests WHERE contractor_id = users.id)
                END as request_count
            FROM users WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (type && type !== '') {
            params.push(type);
            query += ` AND user_type = $${paramCount++}`;
        }

        if (verified !== undefined && verified !== '') {
            params.push(verified === 'true');
            query += ` AND verified = $${paramCount++}`;
        }

        if (search && search !== '') {
            params.push(`%${search}%`);
            query += ` AND (company_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            paramCount++;
        }

        let countQuery = `SELECT COUNT(*) FROM users WHERE 1=1`;
        const countParams = [];
        let cp = 1;
        if (type && type !== '') { countParams.push(type); countQuery += ` AND user_type = $${cp++}`; }
        if (verified !== undefined && verified !== '') { countParams.push(verified === 'true'); countQuery += ` AND verified = $${cp++}`; }
        if (search && search !== '') { countParams.push(`%${search}%`); countQuery += ` AND (company_name ILIKE $${cp} OR email ILIKE $${cp})`; cp++; }
        const countResult = await pool.query(countQuery, countParams);

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            users: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(countResult.rows[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                u.*,
                (SELECT COUNT(*) FROM requests WHERE contractor_id = u.id) as requests_placed,
                (SELECT COUNT(*) FROM requests WHERE shop_id = u.id) as requests_received,
                (SELECT COALESCE(SUM(total_amount), 0) FROM requests WHERE contractor_id = u.id) as total_spent,
                (SELECT COALESCE(SUM(total_amount), 0) FROM requests WHERE shop_id = u.id) as total_earned
            FROM users u
            WHERE u.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

router.put('/users/:id/verify', doubleCsrfProtection, authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { verified } = req.body;

        const result = await pool.query(
            'UPDATE users SET verified = $1 WHERE id = $2 RETURNING id, email, company_name, verified',
            [verified, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        await notifyVerification(user.id, user.company_name, verified);

        res.json({
            message: `User ${verified ? 'verified' : 'unverified'} successfully`,
            user,
        });
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({ error: 'Failed to verify user' });
    }
});

router.put('/users/:id/role', doubleCsrfProtection, authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { user_type } = req.body;

        if (!['shop', 'contractor', 'admin'].includes(user_type)) {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        const result = await pool.query(
            'UPDATE users SET user_type = $1 WHERE id = $2 RETURNING id, email, user_type, company_name',
            [user_type, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User role updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

router.delete('/users/:id', doubleCsrfProtection, authenticateToken, isAdmin, async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { hard_delete } = req.query;

        if (hard_delete === 'true') {
            // Delete related items in a specific order to satisfy FK constraints
            await client.query('DELETE FROM request_items WHERE request_id IN (SELECT id FROM requests WHERE contractor_id = $1 OR shop_id = $1)', [id]);
            await client.query('DELETE FROM disputes WHERE request_id IN (SELECT id FROM requests WHERE contractor_id = $1 OR shop_id = $1) OR reported_by = $1 OR reported_against = $1 OR resolved_by = $1', [id]);
            await client.query('DELETE FROM reviews WHERE request_id IN (SELECT id FROM requests WHERE contractor_id = $1 OR shop_id = $1) OR from_user_id = $1 OR to_user_id = $1', [id]);
            await client.query('DELETE FROM requests WHERE contractor_id = $1 OR shop_id = $1 OR cancelled_by = $1', [id]);
            await client.query('DELETE FROM audit_logs WHERE user_id = $1', [id]);
            await client.query('DELETE FROM products WHERE shop_id = $1', [id]);
            await client.query('DELETE FROM users WHERE id = $1', [id]);
        } else {
            await client.query(
                'UPDATE users SET email = $1, verified = false, deleted_at = NOW() WHERE id = $2',
                [`deleted_${Date.now()}@deleted.com`, id]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    } finally {
        client.release();
    }
});

// ==================== DISPUTE MANAGEMENT ====================

router.get('/disputes', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { status, type, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                d.*,
                u1.company_name as reported_by_name,
                u2.company_name as reported_against_name,
                r.id as request_number,
                r.total_amount
            FROM disputes d
            JOIN users u1 ON d.reported_by = u1.id
            JOIN users u2 ON d.reported_against = u2.id
            JOIN requests r ON d.request_id = r.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (status && status !== '') {
            params.push(status);
            query += ` AND d.status = $${paramCount++}`;
        }

        if (type && type !== '') {
            params.push(type);
            query += ` AND d.dispute_type = $${paramCount++}`;
        }

        if (search && search !== '') {
            params.push(`%${search}%`);
            query += ` AND (
                u1.company_name ILIKE $${paramCount} OR 
                u2.company_name ILIKE $${paramCount} OR 
                d.description ILIKE $${paramCount} OR
                CAST(d.id AS TEXT) ILIKE $${paramCount}
            )`;
            paramCount++;
        }

        const countQuery = `SELECT COUNT(*) FROM (${query}) as count_query`;
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY d.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            disputes: result.rows,
            pagination: { 
                page: parseInt(page), 
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Error fetching disputes:', error);
        res.status(500).json({ error: 'Failed to fetch disputes' });
    }
});

router.get('/disputes/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                d.*,
                u1.company_name as reported_by_name,
                u1.email as reported_by_email,
                u2.company_name as reported_against_name,
                u2.email as reported_against_email,
                r.*,
                u3.company_name as resolved_by_name
            FROM disputes d
            JOIN users u1 ON d.reported_by = u1.id
            JOIN users u2 ON d.reported_against = u2.id
            JOIN requests r ON d.request_id = r.id
            LEFT JOIN users u3 ON d.resolved_by = u3.id
            WHERE d.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispute not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching dispute:', error);
        res.status(500).json({ error: 'Failed to fetch dispute' });
    }
});

router.put('/disputes/:id/status', doubleCsrfProtection, authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution_notes } = req.body;

        const validStatuses = ['open', 'investigating', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        let query = `
            UPDATE disputes 
            SET status = $1, 
                resolved_by = $2,
                resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN NOW() ELSE NULL END
        `;
        const params = [status, req.user.id];

        if (resolution_notes) {
            query += `, resolution_notes = $3`;
            params.push(resolution_notes);
        }

        query += ` WHERE id = $${params.length + 1} RETURNING *`;
        params.push(id);

        const result = await pool.query(query, params);

        // Notify both parties (in-app + email + SMS)
        const disputeParties = await pool.query(
            `SELECT d.reported_by, d.reported_against
             FROM disputes d WHERE d.id = $1`, [id]
        );
        if (disputeParties.rows.length > 0) {
            const { reported_by, reported_against } = disputeParties.rows[0];
            await notifyDisputeUpdate(reported_by,      id, status, resolution_notes);
            await notifyDisputeUpdate(reported_against, id, status, resolution_notes);
        }

        res.json({
            message: 'Dispute updated successfully',
            dispute: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating dispute:', error);
        res.status(500).json({ error: 'Failed to update dispute' });
    }
});

// ==================== PLATFORM SETTINGS ====================

router.get('/settings', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM platform_settings ORDER BY setting_key');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.put('/settings/:key', doubleCsrfProtection, authenticateToken, isAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { setting_value, description } = req.body;

        const result = await pool.query(`
            UPDATE platform_settings 
            SET setting_value = COALESCE($1, setting_value),
                description = COALESCE($2, description),
                updated_at = NOW(),
                updated_by = $3
            WHERE setting_key = $4
            RETURNING *
        `, [setting_value, description, req.user.id, key]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json({
            message: 'Setting updated successfully',
            setting: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// ==================== PLATFORM ANALYTICS ====================

router.get('/analytics', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        // Use parameterized interval via CASE to avoid SQL injection
        const intervalDays = period === 'week' ? 7 : period === 'year' ? 365 : 30;

        const userGrowth = await pool.query(`
            SELECT 
                DATE_TRUNC('day', created_at) as date,
                COUNT(*) as new_users,
                COUNT(CASE WHEN user_type = 'shop' THEN 1 END) as shops,
                COUNT(CASE WHEN user_type = 'contractor' THEN 1 END) as contractors
            FROM users
            WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date DESC
        `, [intervalDays]);

        const revenueOverTime = await pool.query(`
            SELECT 
                DATE_TRUNC('day', request_date) as date,
                COUNT(*) as requests,
                SUM(total_amount) as revenue
            FROM requests
            WHERE request_date >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY DATE_TRUNC('day', request_date)
            ORDER BY date DESC
        `, [intervalDays]);

        const topShops = await pool.query(`
            SELECT 
                u.id,
                u.company_name,
                COUNT(r.id) as requests_received,
                SUM(r.total_amount) as total_revenue
            FROM users u
            JOIN requests r ON u.id = r.shop_id
            WHERE r.request_date >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY u.id, u.company_name
            ORDER BY total_revenue DESC
            LIMIT 10
        `, [intervalDays]);

        const topContractors = await pool.query(`
            SELECT 
                u.id,
                u.company_name,
                COUNT(r.id) as requests_placed,
                SUM(r.total_amount) as total_spent
            FROM users u
            JOIN requests r ON u.id = r.contractor_id
            WHERE r.request_date >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY u.id, u.company_name
            ORDER BY total_spent DESC
            LIMIT 10
        `, [intervalDays]);

        const categoryStats = await pool.query(`
            SELECT 
                p.category,
                COUNT(p.id) as products_count,
                SUM(ri.quantity) as items_sold,
                SUM(ri.subtotal) as revenue
            FROM products p
            LEFT JOIN request_items ri ON p.id = ri.product_id
            LEFT JOIN requests r ON ri.request_id = r.id AND r.request_date >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY p.category
            ORDER BY revenue DESC
        `, [intervalDays]);

        res.json({
            userGrowth: userGrowth.rows,
            revenueOverTime: revenueOverTime.rows,
            topShops: topShops.rows,
            topContractors: topContractors.rows,
            categoryStats: categoryStats.rows
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// ==================== AUDIT LOGS ====================

router.get('/audit-logs', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { user_id, action, entity_type, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT al.*, u.email, u.company_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let p = 1;

        if (user_id) { params.push(user_id); query += ` AND al.user_id = $${p++}`; }
        if (action)  { params.push(`%${action}%`); query += ` AND al.action ILIKE $${p++}`; }
        if (entity_type) { params.push(entity_type); query += ` AND al.entity_type = $${p++}`; }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM audit_logs WHERE 1=1${user_id ? ' AND user_id = $1' : ''}`,
            user_id ? [user_id] : []
        );

        query += ` ORDER BY al.created_at DESC LIMIT $${p} OFFSET $${p + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({
            logs: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(countResult.rows[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;