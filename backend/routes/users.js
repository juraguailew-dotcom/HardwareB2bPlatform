// backend/routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const pool = require('../database/db');
const { authenticateToken, doubleCsrfProtection } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get all shops (for contractor to select when ordering)
router.get('/shops', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, company_name, email, phone, address, verified 
             FROM users 
             WHERE user_type = 'shop'
             ORDER BY verified DESC, company_name ASC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching shops:', error);
        res.status(500).json({ error: 'Failed to fetch shops' });
    }
});

// Get single shop details
router.get('/shops/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT id, company_name, email, phone, address, verified 
             FROM users 
             WHERE id = $1 AND user_type = 'shop'`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching shop:', error);
        res.status(500).json({ error: 'Failed to fetch shop' });
    }
});

// Get shops with their products (optional)
router.get('/shops/:id/products', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM products 
             WHERE shop_id = $1 AND stock_quantity > 0
             ORDER BY name ASC`,
            [id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching shop products:', error);
        res.status(500).json({ error: 'Failed to fetch shop products' });
    }
});

// Get current user's profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, email, company_name, phone, address, tax_id, user_type, verified, created_at, avatar_url
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Upload profile avatar
router.post('/profile/avatar', upload.single('avatar', 'avatars'), doubleCsrfProtection, authenticateToken, async (req, res) => {
    try {
        const file = req.files && req.files[0];
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

        const avatarUrl = useCloudinary
            ? file.secure_url
            : `/uploads/avatars/${path.basename(file.path)}`;

        const { rows } = await pool.query(
            'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url',
            [avatarUrl, req.user.id]
        );
        res.json({ avatar_url: rows[0].avatar_url });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// Update current user's profile
router.put('/profile', doubleCsrfProtection, authenticateToken, async (req, res) => {
    try {
        const { company_name, phone, address, tax_id } = req.body;
        const { rows } = await pool.query(
            `UPDATE users SET
                company_name = COALESCE($1, company_name),
                phone        = COALESCE($2, phone),
                address      = COALESCE($3, address),
                tax_id       = COALESCE($4, tax_id)
             WHERE id = $5
             RETURNING id, email, company_name, phone, address, tax_id, user_type, verified, created_at`,
            [company_name || null, phone || null, address || null, tax_id || null, req.user.id]
        );
        res.json({ message: 'Profile updated successfully', user: rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password (authenticated user)
router.put('/change-password', doubleCsrfProtection, authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password)
            return res.status(400).json({ error: 'Current and new password are required' });
        if (new_password.length < 8)
            return res.status(400).json({ error: 'New password must be at least 8 characters' });

        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
        if (!valid)
            return res.status(401).json({ error: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Get notification preferences
router.get('/notification-preferences', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT notify_email, notify_sms FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// Update notification preferences
router.put('/notification-preferences', doubleCsrfProtection, authenticateToken, async (req, res) => {
    try {
        const { notify_email, notify_sms } = req.body;
        const { rows } = await pool.query(
            `UPDATE users SET
                notify_email = COALESCE($1, notify_email),
                notify_sms   = COALESCE($2, notify_sms)
             WHERE id = $3
             RETURNING notify_email, notify_sms`,
            [notify_email ?? null, notify_sms ?? null, req.user.id]
        );
        res.json({ message: 'Preferences updated', ...rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

module.exports = router;