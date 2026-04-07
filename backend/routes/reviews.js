// backend/routes/reviews.js
const express = require('express');
const pool = require('../database/db');
const { authenticateToken, isShop, doubleCsrfProtection } = require('../middleware/auth');

const router = express.Router();

// Get reviews for a shop or product
router.get('/', async (req, res) => {
    try {
        const { shop_id, product_id } = req.query;
        if (!shop_id && !product_id)
            return res.status(400).json({ error: 'shop_id or product_id required' });

        let query, params;
        if (product_id) {
            query = `
                SELECT r.*, u.company_name as reviewer_name
                FROM reviews r
                JOIN users u ON r.from_user_id = u.id
                JOIN orders o ON r.order_id = o.id
                JOIN order_items oi ON oi.order_id = o.id AND oi.product_id = $1
                WHERE r.order_id = o.id
                ORDER BY r.created_at DESC
            `;
            params = [product_id];
        } else {
            query = `
                SELECT r.*, u.company_name as reviewer_name
                FROM reviews r
                JOIN users u ON r.from_user_id = u.id
                WHERE r.to_user_id = $1
                ORDER BY r.created_at DESC
            `;
            params = [shop_id];
        }

        const result = await pool.query(query, params);

        const avgResult = await pool.query(
            'SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as total FROM reviews WHERE to_user_id = $1',
            [shop_id || result.rows[0]?.to_user_id]
        );

        res.json({ reviews: result.rows, summary: avgResult.rows[0] });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Submit a review (contractor only, order must be delivered)
router.post('/', doubleCsrfProtection, authenticateToken, async (req, res) => {
    try {
        const { order_id, rating, comment } = req.body;

        if (!order_id || !rating)
            return res.status(400).json({ error: 'order_id and rating are required' });

        if (rating < 1 || rating > 5)
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });

        // Verify order belongs to this contractor and is delivered
        const orderResult = await pool.query(
            'SELECT * FROM orders WHERE id = $1 AND contractor_id = $2 AND status = $3',
            [order_id, req.user.id, 'delivered']
        );
        if (orderResult.rows.length === 0)
            return res.status(403).json({ error: 'Order not found, not yours, or not yet delivered' });

        const order = orderResult.rows[0];

        // Prevent duplicate review
        const existing = await pool.query(
            'SELECT id FROM reviews WHERE order_id = $1 AND from_user_id = $2',
            [order_id, req.user.id]
        );
        if (existing.rows.length > 0)
            return res.status(409).json({ error: 'You have already reviewed this order' });

        const result = await pool.query(
            `INSERT INTO reviews (from_user_id, to_user_id, order_id, rating, comment)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.id, order.shop_id, order_id, rating, comment || null]
        );

        res.status(201).json({ message: 'Review submitted', review: result.rows[0] });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// Shop replies to a review
router.put('/:id/reply', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        const check = await pool.query(
            'SELECT id FROM reviews WHERE id = $1 AND to_user_id = $2',
            [id, req.user.id]
        );
        if (check.rows.length === 0)
            return res.status(404).json({ error: 'Review not found or not yours' });

        const result = await pool.query(
            'UPDATE reviews SET reply = $1, reply_at = NOW() WHERE id = $2 RETURNING *',
            [reply, id]
        );
        res.json({ message: 'Reply added', review: result.rows[0] });
    } catch (error) {
        console.error('Error replying to review:', error);
        res.status(500).json({ error: 'Failed to add reply' });
    }
});

// Delete own review (contractor)
router.delete('/:id', doubleCsrfProtection, authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM reviews WHERE id = $1 AND from_user_id = $2 RETURNING id',
            [id, req.user.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Review not found or not yours' });
        res.json({ message: 'Review deleted' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

module.exports = router;
