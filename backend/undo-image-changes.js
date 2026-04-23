require('dotenv').config();
const pool = require('./database/db');

async function run() {
    try {
        console.log('⏮️  Reverting all product images to empty state...');
        
        // Update all products to have empty images array
        const result = await pool.query(
            "UPDATE products SET images = ARRAY[]::text[] RETURNING id, name, images"
        );

        console.log(`✅ Successfully reverted ${result.rows.length} products to original state`);
        result.rows.forEach(p => {
            console.log(`  ✓ Product #${p.id} ${p.name}: images cleared`);
        });

        console.log('\n✨ Done — All product images have been cleared');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

run();
