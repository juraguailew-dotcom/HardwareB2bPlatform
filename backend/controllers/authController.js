// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const pool = require('../database/db');
const User = require('../models/userModel');
const { sendPasswordReset } = require('../utils/email');

// Register a new user
const register = async (req, res) => {
    try {
        const { email, password, user_type, company_name, phone, address, tax_id } = req.body;
        
        // Input validation
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }
        
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        if (!['shop', 'contractor'].includes(user_type)) {
            return res.status(400).json({ error: 'Invalid user type' });
        }
        
        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user in database
        const newUser = await User.create({
            email,
            password_hash: hashedPassword,
            user_type,
            company_name,
            phone,
            address,
            tax_id
        });
        
        // Create JWT token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, user_type: newUser.user_type },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );
        
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                user_type: newUser.user_type,
                company_name: newUser.company_name,
                phone: newUser.phone,
                address: newUser.address,
                verified: newUser.verified
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Compare passwords
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, user_type: user.user_type },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                user_type: user.user_type,
                company_name: user.company_name,
                phone: user.phone,
                address: user.address,
                verified: user.verified
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Forgot password — generate token and email reset link
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await User.findByEmail(email);
        // Always return 200 to prevent email enumeration
        if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [user.id, token, expiresAt]
        );

        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        await sendPasswordReset(email, resetUrl);

        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Reset password — validate token and update password
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
        if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

        const result = await pool.query(
            `SELECT * FROM password_reset_tokens
             WHERE token = $1 AND used = false AND expires_at > NOW()`,
            [token]
        );
        if (result.rows.length === 0)
            return res.status(400).json({ error: 'Invalid or expired reset token' });

        const { user_id } = result.rows[0];
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user_id]);
        await pool.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};