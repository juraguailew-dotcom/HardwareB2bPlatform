// backend/middleware/admin.js
const isAdmin = (req, res, next) => {
    if (req.user.user_type !== 'admin') {
        return res.status(403).json({ 
            error: 'Access denied. Admin only.',
            message: 'You do not have permission to access this resource'
        });
    }
    next();
};

const isSuperAdmin = (req, res, next) => {
    // You can add a super_admin flag to users table if needed
    if (req.user.user_type !== 'admin' || !req.user.is_super_admin) {
        return res.status(403).json({ 
            error: 'Access denied. Super admin only.'
        });
    }
    next();
};

module.exports = { isAdmin, isSuperAdmin };