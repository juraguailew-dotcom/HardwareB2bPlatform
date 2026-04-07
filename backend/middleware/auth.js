// backend/middleware/auth.js
const { doubleCsrf } = require('csrf-csrf');

const { generateCsrfToken: generateToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET || 'fallback-csrf-secret-change-in-production',
    getSessionIdentifier: (req) => req.ip || '',
    cookieName: 'x-csrf-token',
    cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
    },
    size: 64,
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

const authenticateToken = (req, res, next) => {
    const jwt = require('jsonwebtoken');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

const isShop = (req, res, next) => {
    if (req.user.user_type !== 'shop') {
        return res.status(403).json({ error: 'Access denied. Shop only.' });
    }
    next();
};

const isContractor = (req, res, next) => {
    if (req.user.user_type !== 'contractor') {
        return res.status(403).json({ error: 'Access denied. Contractor only.' });
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

module.exports = { authenticateToken, isShop, isContractor, isAdmin, doubleCsrfProtection, generateToken };
