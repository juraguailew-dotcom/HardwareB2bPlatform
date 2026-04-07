// backend/routes/favorites.js
const express = require('express');
const pool = require('../database/db');
const { authenticateToken, isContractor, doubleCsrfProtection } = require('../middleware/auth');

const router = express.Router();

// Get favorites count
router.get('/count', authenticateToken, isContractor, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) FROM favorites WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch favorites count' });
    }
});

// Get user's favorites
router.get('/', authenticateToken, isContractor, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, u.company_name as shop_name,
             f.created_at as favorited_date
             FROM favorites f
             JOIN products p ON f.product_id = p.id
             JOIN users u ON p.shop_id = u.id
             WHERE f.user_id = $1
             ORDER BY f.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

// Add to favorites
router.post('/:productId', doubleCsrfProtection, authenticateToken, isContractor, async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Check if already favorited
        const existing = await pool.query(
            'SELECT * FROM favorites WHERE user_id = $1 AND product_id = $2',
            [req.user.id, productId]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Already in favorites' });
        }
        
        await pool.query(
            'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)',
            [req.user.id, productId]
        );
        
        res.json({ message: 'Added to favorites' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
});

// Remove from favorites
router.delete('/:productId', doubleCsrfProtection, authenticateToken, isContractor, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2',
            [req.user.id, req.params.productId]
        );
        res.json({ message: 'Removed from favorites' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
});

module.exports = router;