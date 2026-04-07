// backend/routes/inventory.js
const express = require('express');
const pool = require('../database/db');
const { authenticateToken, isShop, doubleCsrfProtection } = require('../middleware/auth');

const router = express.Router();

// Get shop's inventory with low stock alerts
router.get('/', authenticateToken, isShop, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM products 
             WHERE shop_id = $1 
             ORDER BY 
                CASE WHEN stock_quantity < 10 THEN 0 ELSE 1 END,
                stock_quantity ASC`,
            [req.user.id]
        );
        
        // Add low stock flag
        const products = result.rows.map(p => ({
            ...p,
            low_stock: p.stock_quantity < 10,
            critical_stock: p.stock_quantity < 5
        }));
        
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Bulk update inventory
router.put('/bulk-update', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { products } = req.body; // Array of {id, stock_quantity}
        
        for (const item of products) {
            await client.query(
                'UPDATE products SET stock_quantity = $1 WHERE id = $2 AND shop_id = $3',
                [item.stock_quantity, item.id, req.user.id]
            );
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Inventory updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to update inventory' });
    } finally {
        client.release();
    }
});

// Get low stock products
router.get('/low-stock', authenticateToken, isShop, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM products 
             WHERE shop_id = $1 AND stock_quantity < 10 
             ORDER BY stock_quantity ASC`,
            [req.user.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
});

module.exports = router;