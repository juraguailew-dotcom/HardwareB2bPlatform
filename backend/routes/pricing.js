// backend/routes/pricing.js
const express = require('express');
const pool = require('../database/db');
const { authenticateToken, isShop, doubleCsrfProtection } = require('../middleware/auth');
const auditLog = require('../utils/audit');

const router = express.Router();

// Get all custom prices set by this shop
router.get('/', authenticateToken, isShop, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT cp.*, u.company_name as contractor_name, p.name as product_name
             FROM contractor_pricing cp
             JOIN users u ON cp.contractor_id = u.id
             JOIN products p ON cp.product_id = p.id
             WHERE cp.shop_id = $1
             ORDER BY u.company_name ASC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pricing tiers' });
    }
});

// Set or update a custom price for a contractor on a product
router.post('/', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    try {
        const { contractor_id, product_id, custom_price } = req.body;
        if (!contractor_id || !product_id || !custom_price) {
            return res.status(400).json({ error: 'contractor_id, product_id, and custom_price are required' });
        }

        // Verify product belongs to this shop
        const productCheck = await pool.query(
            `SELECT id FROM products WHERE id = $1 AND shop_id = $2`, [product_id, req.user.id]
        );
        if (productCheck.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

        const result = await pool.query(
            `INSERT INTO contractor_pricing (shop_id, contractor_id, product_id, custom_price)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (shop_id, contractor_id, product_id)
             DO UPDATE SET custom_price = EXCLUDED.custom_price
             RETURNING *`,
            [req.user.id, contractor_id, product_id, custom_price]
        );

        await auditLog(req.user.id, 'SET_CONTRACTOR_PRICE', 'contractor_pricing', result.rows[0].id,
            { contractor_id, product_id, custom_price }, req.ip);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to set pricing tier' });
    }
});

// Delete a custom price
router.delete('/:id', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    try {
        const check = await pool.query(
            `SELECT id FROM contractor_pricing WHERE id = $1 AND shop_id = $2`,
            [req.params.id, req.user.id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Pricing tier not found' });

        await pool.query(`DELETE FROM contractor_pricing WHERE id = $1`, [req.params.id]);
        await auditLog(req.user.id, 'DELETE_CONTRACTOR_PRICE', 'contractor_pricing', req.params.id, {}, req.ip);
        res.json({ message: 'Pricing tier removed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete pricing tier' });
    }
});

module.exports = router;
