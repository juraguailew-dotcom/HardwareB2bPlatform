// backend/routes/locations.js
const express = require('express');
const pool = require('../database/db');
const { authenticateToken, isShop, doubleCsrfProtection } = require('../middleware/auth');
const auditLog = require('../utils/audit');

const router = express.Router();

// Get all locations for the logged-in shop
router.get('/', authenticateToken, isShop, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM locations WHERE shop_id = $1 ORDER BY is_primary DESC, name ASC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

// Add a new location
router.post('/', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    try {
        const { name, address, phone, is_primary } = req.body;
        if (!name || !address) return res.status(400).json({ error: 'Name and address are required' });

        // If setting as primary, unset others first
        if (is_primary) {
            await pool.query(`UPDATE locations SET is_primary = false WHERE shop_id = $1`, [req.user.id]);
        }

        const result = await pool.query(
            `INSERT INTO locations (shop_id, name, address, phone, is_primary)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.id, name, address, phone || null, is_primary || false]
        );

        await auditLog(req.user.id, 'CREATE_LOCATION', 'location', result.rows[0].id, { name }, req.ip);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create location' });
    }
});

// Update a location
router.put('/:id', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    try {
        const { name, address, phone, is_primary } = req.body;
        const { id } = req.params;

        const check = await pool.query(
            `SELECT id FROM locations WHERE id = $1 AND shop_id = $2`, [id, req.user.id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Location not found' });

        if (is_primary) {
            await pool.query(`UPDATE locations SET is_primary = false WHERE shop_id = $1`, [req.user.id]);
        }

        const result = await pool.query(
            `UPDATE locations SET name = $1, address = $2, phone = $3, is_primary = $4
             WHERE id = $5 RETURNING *`,
            [name, address, phone || null, is_primary || false, id]
        );

        await auditLog(req.user.id, 'UPDATE_LOCATION', 'location', id, { name }, req.ip);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// Delete a location
router.delete('/:id', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    try {
        const check = await pool.query(
            `SELECT id FROM locations WHERE id = $1 AND shop_id = $2`, [req.params.id, req.user.id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Location not found' });

        await pool.query(`DELETE FROM locations WHERE id = $1`, [req.params.id]);
        await auditLog(req.user.id, 'DELETE_LOCATION', 'location', req.params.id, {}, req.ip);
        res.json({ message: 'Location deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete location' });
    }
});

module.exports = router;
