// backend/setup-admin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function setupAdmin() {
    try {
        // Admin credentials
        const adminEmail = 'admin@hardware-platform.com';
        const adminPassword = 'HardwareAdmin2024!';
        
        console.log('Setting up admin user...');
        
        // Check if admin user exists
        const existingAdmin = await pool.query(
            'SELECT id, email, user_type FROM users WHERE user_type = $1 OR email = $2',
            ['admin', adminEmail]
        );
        
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        if (existingAdmin.rows.length > 0) {
            // Update existing admin user
            const adminUser = existingAdmin.rows[0];
            await pool.query(`
                UPDATE users 
                SET email = $1, password_hash = $2, user_type = 'admin', 
                    company_name = 'Platform Admin', verified = true
                WHERE id = $3
            `, [adminEmail, hashedPassword, adminUser.id]);
            
            console.log('✅ Admin user updated successfully!');
            console.log('📧 Email:', adminEmail);
            console.log('🔑 Password:', adminPassword);
            console.log('👤 User ID:', adminUser.id);
        } else {
            // Create new admin user
            const result = await pool.query(`
                INSERT INTO users (email, password_hash, user_type, company_name, verified)
                VALUES ($1, $2, 'admin', 'Platform Admin', true)
                RETURNING id, email, user_type
            `, [adminEmail, hashedPassword]);
            
            console.log('✅ New admin user created successfully!');
            console.log('📧 Email:', adminEmail);
            console.log('🔑 Password:', adminPassword);
            console.log('👤 User ID:', result.rows[0].id);
        }
        
        // Verify admin user exists
        const verification = await pool.query(
            'SELECT id, email, user_type, company_name, verified FROM users WHERE user_type = $1',
            ['admin']
        );
        
        console.log('\n📋 Current admin users:');
        verification.rows.forEach(user => {
            console.log(`- ID: ${user.id}, Email: ${user.email}, Verified: ${user.verified}`);
        });
        
    } catch (error) {
        console.error('❌ Error setting up admin:', error);
    } finally {
        process.exit();
    }
}

setupAdmin();