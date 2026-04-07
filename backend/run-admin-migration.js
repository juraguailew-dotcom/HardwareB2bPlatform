// backend/run-admin-migration.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function runAdminMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Running admin features migration...');
        
        const migrationPath = path.join(__dirname, 'database', 'migrate-admin-features.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query(migrationSQL);
        
        console.log('✅ Admin features migration completed successfully!');
        console.log('📋 Created tables:');
        console.log('   - platform_settings');
        console.log('   - audit_logs');
        console.log('   - disputes');
        console.log('   - password_reset_tokens');
        console.log('💾 Inserted default platform settings');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runAdminMigration();