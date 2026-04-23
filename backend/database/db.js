// backend/database/db.js
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
    }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    };

const pool = new Pool({
    ...poolConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    maxUses: 7500,
});

const connectWithRetry = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            console.log(`✅ Connected to PostgreSQL database: ${process.env.DB_NAME || 'unknown'}`);
            client.release();
            return;
        } catch (err) {
            console.error(`❌ Database connection attempt ${i + 1} failed:`, err.message);
            if (i < retries - 1) {
                console.log(`Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error('Failed to connect to database after multiple retries');
};

connectWithRetry().catch(err => {
    console.error('Final database connection error:', err.message);
    process.exit(1);
});

module.exports = pool;
