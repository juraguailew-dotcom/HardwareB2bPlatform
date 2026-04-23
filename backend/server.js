// Load environment variables FIRST - must be before any other requires
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const { doubleCsrfProtection, generateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Create express app
const app = express();
const { authRateLimit, apiRateLimit } = require('./middleware/rateLimit');

// Create HTTP server (for socket.io)
const server = http.createServer(app);

// ============= MIDDLEWARE =============
// These MUST come before any routes!
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "http:", process.env.CLIENT_URL || "http://localhost:3000"],
            fontSrc: ["'self'", "https:", "data:"],
            connectSrc: ["'self'", "http:", "https:", process.env.CLIENT_URL || "http://localhost:3000"],
            frameAncestors: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));
app.use(compression());
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true
}));
app.use('/uploads/chat', express.static(require('path').join(__dirname, 'uploads', 'chat'), {
    maxAge: '1d',
    etag: true
}));
app.use('/api/auth', authRateLimit);
app.use('/api', apiRateLimit);

// ============= IMPORT ROUTES =============
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const requestRoutes = require('./routes/requests');
const inventoryRoutes = require('./routes/inventory');
const analyticsRoutes = require('./routes/analytics');
const favoritesRoutes = require('./routes/favorites');
const templatesRoutes = require('./routes/templates');
const invoicesRoutes = require('./routes/invoices');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const locationRoutes = require('./routes/locations');
const pricingRoutes = require('./routes/pricing');
const chatRoutes = require('./routes/chat');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');

// ============= USE ROUTES =============
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/v2/requests', requestRoutes);
app.use('/api/orders', requestRoutes);
app.use('/api/v1/orders', requestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// ============= CSRF TOKEN ENDPOINT =============
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: generateToken(req, res) });
});

// ============= TEST ROUTE =============
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Backend is working! B2B Hardware Platform',
        bodyParser: 'enabled'
    });
});

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        server: 'running',
        timestamp: new Date().toISOString()
    });
});

// ============= SOCKET.IO INITIALIZATION =============
const { initializeSocket } = require('./socket/chat');
const io = initializeSocket(server);

// ============= ERROR HANDLING =============
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Centralized error handler
app.use(errorHandler);

// ============= START SERVER =============
const PORT = process.env.PORT || 5000;
const runMigrations = require('./database/migrate');

runMigrations()
    .then(() => {
        server.listen(PORT, () => {
            console.log('=================================');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 WebSocket server initialized`);
            console.log(`🔗 Test API: http://localhost:${PORT}/api/test`);
            console.log(`💾 Database: ${process.env.DB_NAME || 'hardware_b2b'}`);
            console.log(`💰 Currency: PNG Kina (K)`);
            console.log('=================================');
        });
    })
    .catch(err => {
        console.error('❌ Server failed to start due to migration error:', err.message);
        process.exit(1);
    });

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
