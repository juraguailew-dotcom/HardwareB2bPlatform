// backend/database/db.js
let pool;

const getPool = () => {
    if (!pool) {
        const { Pool } = require('pg');
        pool = new Pool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
        });

        pool.connect((err, client, release) => {
            if (err) {
                return console.error('Error connecting to database:', err.stack);
            }
            console.log(`✅ Connected to PostgreSQL database: ${process.env.DB_NAME}`);
            release();
        });
    }
    return pool;
};

module.exports = getPool();
