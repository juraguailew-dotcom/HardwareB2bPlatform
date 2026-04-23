const productRepository = require('../repositories/productRepository');
const CURRENCY = require('../config/currency');
const AppError = require('../utils/AppError');

const formatProduct = (product) => ({
    ...product,
    // Ensure images is always an array (PostgreSQL TEXT[] may return null if never set)
    images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
    currency: CURRENCY.code,
    currency_symbol: CURRENCY.symbol,
    formatted_unit_price: CURRENCY.format(product.unit_price),
    formatted_bulk_price: product.bulk_price ? CURRENCY.format(product.bulk_price) : null
});

const validateProductPayload = (payload) => {
    const parsedUnitPrice = Number(payload.unit_price);
    const parsedStockQuantity = Number(payload.stock_quantity);

    if (!payload.name) {
        throw new AppError('Product name is required', 400);
    }
    if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
        throw new AppError('Product unit price must be a non-negative number', 400);
    }
    if (!Number.isFinite(parsedStockQuantity) || parsedStockQuantity < 0) {
        throw new AppError('Stock quantity must be a non-negative integer', 400);
    }

    return {
        name: payload.name,
        description: payload.description || '',
        category: payload.category || null,
        unit_price: parsedUnitPrice,
        bulk_price: payload.bulk_price !== undefined && payload.bulk_price !== null
            ? Number(payload.bulk_price)
            : undefined,
        minimum_bulk_quantity: payload.minimum_bulk_quantity !== undefined && payload.minimum_bulk_quantity !== null
            ? Number(payload.minimum_bulk_quantity)
            : undefined,
        stock_quantity: parsedStockQuantity,
        unit_type: payload.unit_type || null,
        pricing_method: payload.pricing_method || null,
        sku: payload.sku || null,
        brand: payload.brand || null,
        tags: Array.isArray(payload.tags) ? payload.tags : payload.tags || null,
        images: Array.isArray(payload.images) ? payload.images : payload.images || null,
    };
};

const compareProducts = async (name) => {
    if (!name) {
        throw new AppError('Product name is required for comparison', 400);
    }
    const result = await productRepository.compareProductsByName(name);
    return result.rows.map(formatProduct);
};

const searchProducts = async (queryText) => {
    if (!queryText) {
        throw new AppError('Search query is required', 400);
    }
    const result = await productRepository.searchProducts(queryText);
    return result.rows.map(formatProduct);
};

const getProducts = async (filters) => {
    const result = await productRepository.findAllProducts(filters);
    return result.rows.map(formatProduct);
};

const getProductById = async (id) => {
    const result = await productRepository.findProductById(id);
    if (result.rows.length === 0) {
        throw new AppError('Product not found', 404);
    }
    return formatProduct(result.rows[0]);
};

const addProduct = async (shopId, payload) => {
    const body = validateProductPayload(payload);
    const result = await productRepository.createProduct({
        shop_id: shopId,
        ...body
    });
    return formatProduct(result.rows[0]);
};

const updateProduct = async (productId, shopId, payload) => {
    const existing = await productRepository.findProductByIdForShop(productId, shopId);
    if (existing.rows.length === 0) {
        throw new AppError('Product not found or not authorized', 404);
    }
    const body = validateProductPayload(payload);
    const result = await productRepository.updateProductById(productId, body);
    return formatProduct(result.rows[0]);
};

const updateProductStock = async (productId, shopId, stockQuantity) => {
    const existing = await productRepository.findProductByIdForShop(productId, shopId);
    if (existing.rows.length === 0) {
        throw new AppError('Product not found or not authorized', 404);
    }

    const parsedStockQuantity = Number(stockQuantity);
    if (!Number.isFinite(parsedStockQuantity) || parsedStockQuantity < 0) {
        throw new AppError('Stock quantity must be a non-negative integer', 400);
    }

    const result = await productRepository.updateProductById(productId, {
        stock_quantity: parsedStockQuantity
    });
    return formatProduct(result.rows[0]);
};

const uploadProductImages = async (productId, shopId, files) => {
    const existing = await productRepository.findProductByIdForShop(productId, shopId);
    if (existing.rows.length === 0) {
        throw new AppError('Product not found or not authorized', 404);
    }

    if (!Array.isArray(files) || files.length === 0) {
        throw new AppError('No images uploaded', 400);
    }

    const currentImages = existing.rows[0].images || [];
    const newUrls = files.map(f => f.secure_url || `/uploads/products/${f.filename}`);
    const merged = [...currentImages, ...newUrls].slice(0, 5);
    const result = await productRepository.setProductImages(productId, merged);
    return result.rows[0];
};

const deleteProductImage = async (productId, shopId, imageUrl) => {
    const existing = await productRepository.findProductByIdForShop(productId, shopId);
    if (existing.rows.length === 0) {
        throw new AppError('Product not found or not authorized', 404);
    }

    const images = existing.rows[0].images || [];
    const updatedImages = images.filter(url => url !== imageUrl);
    const result = await productRepository.setProductImages(productId, updatedImages);
    return result.rows[0];
};

module.exports = {
    compareProducts,
    searchProducts,
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    updateProductStock,
    uploadProductImages,
    deleteProductImage,
};
