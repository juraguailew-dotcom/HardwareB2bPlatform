// backend/create-admin.js
const bcrypt = require('bcrypt');
const pool = require('./database/db');

async function createAdmin() {
    try {
        const email = process.env.ADMIN_EMAIL || 'admin@hardware-platform.com';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        
        // Check if admin already exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.log('Admin user already exists!');
            return;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create admin user
        const result = await pool.query(`
            INSERT INTO users (email, password_hash, user_type, company_name, verified)
            VALUES ($1, $2, 'admin', 'Platform Admin', true)
            RETURNING id, email, user_type
        `, [email, hashedPassword]);
        
        console.log('Admin user created successfully:');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('User ID:', result.rows[0].id);
        
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        process.exit();
    }
}

createAdmin();