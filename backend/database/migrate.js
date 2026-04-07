// backend/database/migrate.js
const fs = require('fs');
const path = require('path');
const pool = require('./db');

const MIGRATIONS_DIR = path.join(__dirname);

// All migration files in the order they should run
const MIGRATIONS = [
    'migrate-enterprise.sql',
    'migrate-fulfillment.sql',
    'migrate-templates.sql',
    'migrate-category-pricing.sql',
    'migrate-chat.sql',
    'migrate-chat-attachments.sql',
    'migrate-features.sql',
    'migrate-notification-prefs.sql',
    'migrate-orders-features.sql',
    'migrations/20260330_rename_orders_to_requests.sql',
    'migrations/20260330_rename_remaining_orders_to_requests.sql',
    'migrate-order-request-compatibility.sql',
];

const runMigrations = async () => {
    const client = await pool.connect();
    try {
        // Create migrations tracking table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        for (const filename of MIGRATIONS) {
            // Skip if already run
            const { rows } = await client.query(
                'SELECT id FROM _migrations WHERE filename = $1',
                [filename]
            );
            if (rows.length > 0) continue;

            const filepath = path.join(MIGRATIONS_DIR, filename);
            if (!fs.existsSync(filepath)) {
                console.warn(`⚠️  Migration file not found, skipping: ${filename}`);
                continue;
            }

            const sql = fs.readFileSync(filepath, 'utf8');
            await client.query(sql);
            await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [filename]);
            console.log(`✅ Migration applied: ${filename}`);
        }
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
    }
};

module.exports = runMigrations;
