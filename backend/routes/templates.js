// backend/routes/templates.js
const express = require('express');
const pool = require('../database/db');
const { authenticateToken, doubleCsrfProtection } = require('../middleware/auth');

const router = express.Router();

const { isContractor } = require('../middleware/auth');

// Ensure tables exist on startup
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_templates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS template_items (
                id SERIAL PRIMARY KEY,
                template_id INTEGER REFERENCES order_templates(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL DEFAULT 1
            )
        `);
    } catch (err) {
        console.error('Templates table init error:', err.message);
    }
})();

// Get user's templates with items
router.get('/', authenticateToken, isContractor, async (req, res) => {
    try {
        const templates = await pool.query(
            'SELECT * FROM order_templates WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );

        // Attach items with product details to each template
        for (const t of templates.rows) {
            const items = await pool.query(
                `SELECT ti.*, p.name, p.unit_price, p.bulk_price, p.minimum_bulk_quantity, p.images, p.shop_id
                 FROM template_items ti
                 JOIN products p ON ti.product_id = p.id
                 WHERE ti.template_id = $1`,
                [t.id]
            );
            t.items = items.rows;
        }

        res.json(templates.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Create template
router.post('/', authenticateToken, isContractor, async (req, res) => {
    const { name, items } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Template name is required' });
    if (!items?.length) return res.status(400).json({ error: 'At least one item is required' });

    try {
        const templateResult = await pool.query(
            'INSERT INTO order_templates (user_id, name) VALUES ($1, $2) RETURNING id',
            [req.user.id, name.trim()]
        );
        const templateId = templateResult.rows[0].id;

        for (const item of items) {
            await pool.query(
                'INSERT INTO template_items (template_id, product_id, quantity) VALUES ($1, $2, $3)',
                [templateId, item.product_id, item.quantity]
            );
        }

        res.status(201).json({ message: 'Template created', templateId });
    } catch (error) {
        console.error('Create template error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to create template' });
    }
});

// Update template
router.put('/:id', authenticateToken, isContractor, async (req, res) => {
    const { name, items } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Template name is required' });
    if (!items?.length) return res.status(400).json({ error: 'At least one item is required' });

    try {
        const result = await pool.query(
            'UPDATE order_templates SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id',
            [name.trim(), req.params.id, req.user.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Template not found' });

        await pool.query('DELETE FROM template_items WHERE template_id = $1', [req.params.id]);

        for (const item of items) {
            await pool.query(
                'INSERT INTO template_items (template_id, product_id, quantity) VALUES ($1, $2, $3)',
                [req.params.id, item.product_id, item.quantity]
            );
        }

        res.json({ message: 'Template updated' });
    } catch (error) {
        console.error('Update template error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to update template' });
    }
});

// Delete template
router.delete('/:id', authenticateToken, isContractor, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM order_templates WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Template not found' });
        res.json({ message: 'Template deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

module.exports = router;
