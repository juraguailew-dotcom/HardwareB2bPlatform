const pool = require('../database/db');

const PRODUCT_BASE_FIELDS = `
    p.id,
    p.name,
    p.category,
    p.unit_price,
    p.bulk_price,
    p.minimum_bulk_quantity,
    p.stock_quantity,
    p.unit_type,
    p.images,
    p.brand,
    p.description,
    u.id AS shop_id,
    u.company_name AS shop_name,
    u.address AS shop_address,
    u.phone AS shop_phone
`;

const run = (client, sql, params = []) => (client || pool).query(sql, params);

const compareProductsByName = (name) => run(
    null,
    `SELECT ${PRODUCT_BASE_FIELDS}
     FROM products p
     JOIN users u ON p.shop_id = u.id
     WHERE p.name ILIKE $1 AND p.stock_quantity > 0
     ORDER BY p.unit_price ASC`,
    [`%${name}%`]
);

const searchProducts = (queryText) => run(
    null,
    `SELECT ${PRODUCT_BASE_FIELDS}
     FROM products p
     JOIN users u ON p.shop_id = u.id
     WHERE (p.name ILIKE $1 OR p.category ILIKE $1 OR p.description ILIKE $1)
     ORDER BY p.name ASC
     LIMIT 5`,
    [`%${queryText}%`]
);

const findAllProducts = ({ category, shop_id, search }) => {
    let sql = `SELECT p.*, u.company_name as shop_name
               FROM products p
               JOIN users u ON p.shop_id = u.id
               WHERE p.stock_quantity > 0`;
    const params = [];

    if (category) {
        params.push(category);
        sql += ` AND p.category = $${params.length}`;
    }

    if (shop_id) {
        params.push(shop_id);
        sql += ` AND p.shop_id = $${params.length}`;
    }

    if (search) {
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
        sql += ` AND (p.name ILIKE $${params.length - 1} OR p.description ILIKE $${params.length})`;
    }

    sql += ' ORDER BY p.created_at DESC';
    return run(null, sql, params);
};

const findProductById = (id) => run(
    null,
    `SELECT p.*, u.company_name as shop_name
     FROM products p
     JOIN users u ON p.shop_id = u.id
     WHERE p.id = $1`,
    [id]
);

const findProductByIdForShop = (id, shopId) => run(
    null,
    `SELECT p.*, u.company_name as shop_name
     FROM products p
     JOIN users u ON p.shop_id = u.id
     WHERE p.id = $1 AND p.shop_id = $2`,
    [id, shopId]
);

const createProduct = ({
    shop_id, name, description, category,
    unit_price, bulk_price, minimum_bulk_quantity,
    stock_quantity, unit_type, pricing_method,
    sku, brand, tags, images
}) => {
    const fields = ['shop_id', 'name', 'description', 'category', 'unit_price', 'stock_quantity'];
    const values = [shop_id, name, description || '', category || '', unit_price, stock_quantity];
    const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6'];

    if (bulk_price !== undefined) {
        fields.push('bulk_price');
        values.push(bulk_price);
        placeholders.push(`$${values.length}`);
    }
    if (minimum_bulk_quantity !== undefined) {
        fields.push('minimum_bulk_quantity');
        values.push(minimum_bulk_quantity);
        placeholders.push(`$${values.length}`);
    }
    if (unit_type !== undefined) {
        fields.push('unit_type');
        values.push(unit_type);
        placeholders.push(`$${values.length}`);
    }
    if (pricing_method !== undefined) {
        fields.push('pricing_method');
        values.push(pricing_method);
        placeholders.push(`$${values.length}`);
    }
    if (sku !== undefined) {
        fields.push('sku');
        values.push(sku);
        placeholders.push(`$${values.length}`);
    }
    if (brand !== undefined) {
        fields.push('brand');
        values.push(brand);
        placeholders.push(`$${values.length}`);
    }
    if (tags !== undefined) {
        fields.push('tags');
        values.push(tags);
        placeholders.push(`$${values.length}`);
    }
    if (images !== undefined) {
        fields.push('images');
        values.push(images);
        placeholders.push(`$${values.length}`);
    }

    const sql = `INSERT INTO products (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    return run(null, sql, values);
};

const updateProductById = (id, fields) => {
    const keys = Object.keys(fields);
    if (keys.length === 0) {
        throw new Error('No fields provided for update');
    }
    const values = keys.map(key => fields[key]);
    const setClause = keys.map((key, index) => `${key}=$${index + 1}`).join(', ');
    return run(null,
        `UPDATE products SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
    );
};

const setProductImages = (productId, images) => run(
    null,
    'UPDATE products SET images = $1 WHERE id = $2 RETURNING id, images',
    [images, productId]
);

module.exports = {
    compareProductsByName,
    searchProducts,
    findAllProducts,
    findProductById,
    findProductByIdForShop,
    createProduct,
    updateProductById,
    setProductImages,
};
