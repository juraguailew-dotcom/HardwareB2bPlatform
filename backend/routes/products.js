

const express = require('express');
const pool = require('../database/db');
const CURRENCY = require('../config/currency');
const { authenticateToken, isShop } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

const router = express.Router();

// Price comparison — find same/similar products across shops
router.get('/compare', async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: 'name query required' });
        const result = await pool.query(
            `SELECT p.id, p.name, p.category, p.unit_price, p.bulk_price,
                    p.minimum_bulk_quantity, p.stock_quantity, p.unit_type,
                    p.images, p.brand, p.description,
                    u.id as shop_id, u.company_name as shop_name,
                    u.address as shop_address, u.phone as shop_phone
             FROM products p
             JOIN users u ON p.shop_id = u.id
             WHERE p.name ILIKE $1 AND p.stock_quantity > 0
             ORDER BY p.unit_price ASC`,
            [`%${name}%`]
        );
        const rows = result.rows.map(p => ({
            ...p,
            formatted_unit_price: CURRENCY.format(p.unit_price),
            formatted_bulk_price: p.bulk_price ? CURRENCY.format(p.bulk_price) : null,
        }));
        res.json(rows);
    } catch (error) {
        console.error('Price compare error:', error);
        res.status(500).json({ error: 'Failed to compare prices' });
    }
});

// Search products by name/category for chatbot
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: 'Query required' });
        const result = await pool.query(
            `SELECT p.id, p.name, p.category, p.unit_price, p.bulk_price,
                    p.minimum_bulk_quantity, p.stock_quantity, p.unit_type,
                    p.description, u.company_name as shop_name, u.phone as shop_phone
             FROM products p
             JOIN users u ON p.shop_id = u.id
             WHERE (p.name ILIKE $1 OR p.category ILIKE $1 OR p.description ILIKE $1)
             ORDER BY p.name ASC
             LIMIT 5`,
            [`%${q}%`]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Failed to search products' });
    }
});

// Get all products (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { category, shop_id, search } = req.query;
        let query = `
            SELECT p.*, u.company_name as shop_name 
            FROM products p 
            JOIN users u ON p.shop_id = u.id 
            WHERE p.stock_quantity > 0
        `;
        const params = [];
        let paramCount = 1;
        
        if (category) {
            params.push(category);
            query += ` AND p.category = $${paramCount}`;
            paramCount++;
        }
        
        if (shop_id) {
            params.push(shop_id);
            query += ` AND p.shop_id = $${paramCount}`;
            paramCount++;
        }
        
        if (search) {
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam);
            const p1 = paramCount++;
            const p2 = paramCount++;
            query += ` AND (p.name ILIKE $${p1} OR p.description ILIKE $${p2})`;
        }
        
        query += ' ORDER BY p.created_at DESC';
        
        const result = await pool.query(query, params);
        
        // Add currency info to each product
        const productsWithCurrency = result.rows.map(product => ({
            ...product,
            currency: CURRENCY.code,
            currency_symbol: CURRENCY.symbol,
            formatted_unit_price: CURRENCY.format(product.unit_price),
            formatted_bulk_price: product.bulk_price ? CURRENCY.format(product.bulk_price) : null
        }));
        
        res.json(productsWithCurrency);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT p.*, u.company_name as shop_name FROM products p JOIN users u ON p.shop_id = u.id WHERE p.id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = result.rows[0];
        
        // Add currency info
        const productWithCurrency = {
            ...product,
            currency: CURRENCY.code,
            currency_symbol: CURRENCY.symbol,
            formatted_unit_price: CURRENCY.format(product.unit_price),
            formatted_bulk_price: product.bulk_price ? CURRENCY.format(product.bulk_price) : null
        };
        
        res.json(productWithCurrency);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Add a new product (shop only) - FIXED VERSION
router.post('/', authenticateToken, isShop, async (req, res) => {
    console.log('📦 Product creation request received');
    console.log('User ID:', req.user?.id);
    console.log('Request body:', req.body);
    
    try {
        const {
            name,
            description,
            category,
            unit_price,
            bulk_price,
            minimum_bulk_quantity,
            stock_quantity,
            unit_type,
            sku,
            brand,
            tags,
            images
        } = req.body;
        
        // Validate required fields
        if (!name || !unit_price || !stock_quantity) {
            console.log('❌ Validation failed: Missing required fields');
            return res.status(400).json({ 
                error: 'Name, price, and stock quantity are required',
                received: { name: !!name, unit_price: !!unit_price, stock_quantity: !!stock_quantity }
            });
        }
        
        // Parse numeric values
        const parsedUnitPrice = parseFloat(unit_price);
        const parsedStockQuantity = parseInt(stock_quantity);
        const parsedBulkPrice = bulk_price ? parseFloat(bulk_price) : null;
        const parsedMinBulkQuantity = minimum_bulk_quantity ? parseInt(minimum_bulk_quantity) : null;
        
        console.log('✅ Validation passed');
        console.log('Parsed values:', {
            unit_price: parsedUnitPrice,
            stock_quantity: parsedStockQuantity,
            bulk_price: parsedBulkPrice,
            min_bulk: parsedMinBulkQuantity
        });
        
        // Allowlisted fields to prevent SQL injection via dynamic query construction
        const ALLOWED_FIELDS = new Set([
            'shop_id', 'name', 'description', 'category', 'unit_price', 'stock_quantity',
            'bulk_price', 'minimum_bulk_quantity', 'unit_type', 'pricing_method', 'sku', 'brand', 'tags', 'images'
        ]);

        const fields = ['shop_id', 'name', 'description', 'category', 'unit_price', 'stock_quantity'];
        const values = [req.user.id, name, description || '', category || '', parsedUnitPrice, parsedStockQuantity];
        let paramCounter = 7;

        const { pricing_method } = req.body;
        const CATEGORY_PRICING_DEFAULTS = {
            tools: 'bulk', hardware: 'bulk', safety: 'bulk', fasteners: 'bulk',
            materials: 'measure', lumber: 'measure', roofing: 'measure',
            paint: 'volume', adhesives: 'volume',
            electrical: 'kit', plumbing: 'kit',
            garden: 'bundle'
        };
        const resolvedPricingMethod = pricing_method ||
            CATEGORY_PRICING_DEFAULTS[category?.toLowerCase()] || 'unit';

        const optionalFields = [
            { field: 'bulk_price', value: parsedBulkPrice },
            { field: 'minimum_bulk_quantity', value: parsedMinBulkQuantity },
            { field: 'unit_type', value: unit_type || null },
            { field: 'pricing_method', value: resolvedPricingMethod },
            { field: 'sku', value: sku || null },
            { field: 'brand', value: brand || null },
            { field: 'tags', value: tags && tags.length > 0 ? tags : null },
            { field: 'images', value: images && images.length > 0 ? images : null },
        ];

        for (const { field, value } of optionalFields) {
            if (value !== null && value !== undefined && ALLOWED_FIELDS.has(field)) {
                fields.push(field);
                values.push(value);
                paramCounter++;
            }
        }

        const valuePlaceholders = values.map((_, i) => `$${i + 1}`);

        // Final allowlist guard before interpolating field names into SQL
        const safeFields = fields.filter(f => ALLOWED_FIELDS.has(f));

        const query = `
            INSERT INTO products (${safeFields.join(', ')})
            VALUES (${valuePlaceholders.join(', ')})
            RETURNING *
        `;
        
        console.log('Executing query:', query);
        console.log('With values:', values);
        
        const result = await pool.query(query, values);
        
        console.log('✅ Product created successfully:', result.rows[0].id);
        
        res.status(201).json({
            message: 'Product added successfully',
            product: result.rows[0]
        });
    } catch (error) {
        console.error('❌ ERROR ADDING PRODUCT:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error detail:', error.detail);
        console.error('Error stack:', error.stack);
        
        // Check for specific PostgreSQL errors
        if (error.code === '23502') { // NOT NULL violation
            return res.status(400).json({ 
                error: 'Missing required field',
                details: error.message
            });
        } else if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ 
                error: 'Invalid shop ID',
                details: 'The shop does not exist'
            });
        } else if (error.code === '42703') { // Undefined column
            return res.status(400).json({ 
                error: 'Database schema mismatch',
                details: 'Please run database migrations'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to add product',
            details: error.message,
            code: error.code
        });
    }
});

// Update full product details (shop only — must own the product)
router.put('/:id', authenticateToken, isShop, async (req, res) => {
    try {
        const { id } = req.params;
        const check = await pool.query(
            'SELECT id FROM products WHERE id = $1 AND shop_id = $2',
            [id, req.user.id]
        );
        if (check.rows.length === 0)
            return res.status(404).json({ error: 'Product not found or not authorized' });

        const {
            name, description, category, unit_price, bulk_price,
            minimum_bulk_quantity, stock_quantity, unit_type,
            pricing_method, sku, brand, tags
        } = req.body;

        if (!name || !unit_price || !stock_quantity)
            return res.status(400).json({ error: 'Name, price, and stock quantity are required' });

        const result = await pool.query(
            `UPDATE products SET
                name = $1, description = $2, category = $3,
                unit_price = $4, bulk_price = $5, minimum_bulk_quantity = $6,
                stock_quantity = $7, unit_type = $8, pricing_method = $9,
                sku = $10, brand = $11, tags = $12
             WHERE id = $13 RETURNING *`,
            [
                name, description || '', category || '',
                parseFloat(unit_price),
                bulk_price ? parseFloat(bulk_price) : null,
                minimum_bulk_quantity ? parseInt(minimum_bulk_quantity) : null,
                parseInt(stock_quantity), unit_type || 'pieces',
                pricing_method || 'unit', sku || null, brand || null,
                tags && tags.length > 0 ? tags : null,
                id
            ]
        );
        res.json({ message: 'Product updated successfully', product: result.rows[0] });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Update product stock (shop only)
router.put('/:id/stock', authenticateToken, isShop, async (req, res) => {
    try {
        const { id } = req.params;
        const { stock_quantity } = req.body;
        
        // Check if product belongs to this shop
        const productCheck = await pool.query(
            'SELECT * FROM products WHERE id = $1 AND shop_id = $2',
            [id, req.user.id]
        );
        
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not authorized' });
        }
        
        const result = await pool.query(
            'UPDATE products SET stock_quantity = $1 WHERE id = $2 RETURNING *',
            [stock_quantity, id]
        );
        
        res.json({
            message: 'Stock updated successfully',
            product: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Upload images for a product (shop only) — up to 5 files
router.post('/:id/images', authenticateToken, isShop, upload.array('images', 5), async (req, res) => {
    try {
        const { id } = req.params;

        // Verify product belongs to this shop
        const check = await pool.query(
            'SELECT id, images FROM products WHERE id = $1 AND shop_id = $2',
            [id, req.user.id]
        );
        if (check.rows.length === 0)
            return res.status(404).json({ error: 'Product not found or not authorized' });

        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'No images uploaded' });

        // Build URL list — Cloudinary gives secure_url, disk gives a relative path
        const newUrls = req.files.map(f =>
            f.secure_url || `/uploads/products/${f.filename}`
        );

        const existing = check.rows[0].images || [];
        const merged = [...existing, ...newUrls].slice(0, 5); // cap at 5

        const result = await pool.query(
            'UPDATE products SET images = $1 WHERE id = $2 RETURNING id, images',
            [merged, id]
        );

        res.json({ message: 'Images uploaded successfully', images: result.rows[0].images });
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

// Delete a single image from a product (shop only)
router.delete('/:id/images', authenticateToken, isShop, async (req, res) => {
    try {
        const { id } = req.params;
        const { imageUrl } = req.body;

        const check = await pool.query(
            'SELECT id, images FROM products WHERE id = $1 AND shop_id = $2',
            [id, req.user.id]
        );
        if (check.rows.length === 0)
            return res.status(404).json({ error: 'Product not found or not authorized' });

        const updated = (check.rows[0].images || []).filter(url => url !== imageUrl);
        const result = await pool.query(
            'UPDATE products SET images = $1 WHERE id = $2 RETURNING id, images',
            [updated, id]
        );

        res.json({ message: 'Image removed', images: result.rows[0].images });
    } catch (error) {
        console.error('Error removing image:', error);
        res.status(500).json({ error: 'Failed to remove image' });
    }
});

module.exports = router;