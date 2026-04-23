require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./database/db');

async function run() {
    try {
        // Get all uploaded image files
        const uploadsDir = path.join(__dirname, 'uploads', 'products');
        const files = fs.readdirSync(uploadsDir)
            .filter(f => f.startsWith('product-') && !f.startsWith('.'))
            .map(f => `/uploads/products/${f}`);

        console.log(`✅ Found ${files.length} uploaded image files`);

        // Get all products
        const productsResult = await pool.query('SELECT id FROM products ORDER BY id');
        const products = productsResult.rows;

        console.log(`✅ Found ${products.length} products in database`);

        if (products.length === 0) {
            console.log('⚠️  No products found!');
            await pool.end();
            return;
        }

        // Distribute uploaded images among products
        // Each product gets a roughly equal share of images (max 5 per product for uploads)
        const imagesPerProduct = Math.ceil(files.length / products.length);
        let updated = 0;

        for (let i = 0; i < products.length; i++) {
            const productId = products[i].id;
            const startIdx = i * imagesPerProduct;
            const endIdx = Math.min(startIdx + 5, files.length); // Max 5 images per product
            
            const productImages = files.slice(startIdx, endIdx);

            if (productImages.length > 0) {
                await pool.query('UPDATE products SET images = $1 WHERE id = $2', [productImages, productId]);
                console.log(`✅ Product #${productId}: assigned ${productImages.length} image(s)`);
                updated++;
            }
        }

        console.log(`\n✨ Done — ${updated} products updated with ${files.length} uploaded images`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

run();
