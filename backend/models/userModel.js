// backend/models/userModel.js
const getPool = () => require('../database/db');

const User = {
    // Find user by email
    async findByEmail(email) {
        const result = await getPool().query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },
    
    // Find user by ID
    async findById(id) {
        const result = await getPool().query(
            'SELECT id, email, user_type, company_name, phone, address, verified, created_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    },
    
    // Create new user
    async create(userData) {
        const { email, password_hash, user_type, company_name, phone, address, tax_id } = userData;
        
        const result = await getPool().query(
            `INSERT INTO users 
            (email, password_hash, user_type, company_name, phone, address, tax_id, verified) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id, email, user_type, company_name, phone, address, verified`,
            [email, password_hash, user_type, company_name, phone, address, tax_id, false]
        );
        
        return result.rows[0];
    },
    
    // Update user verification status
    async verifyUser(id) {
        const result = await getPool().query(
            'UPDATE users SET verified = true WHERE id = $1 RETURNING id, email, verified',
            [id]
        );
        return result.rows[0];
    }
};

module.exports = User;