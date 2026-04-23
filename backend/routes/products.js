const express = require('express');
const { authenticateToken, isShop } = require('../middleware/auth');
const upload = require('../middleware/upload');
const asyncHandler = require('../middleware/asyncHandler');
const productService = require('../services/productService');

const router = express.Router();

router.get('/compare', asyncHandler(async (req, res) => {
    const { name } = req.query;
    const rows = await productService.compareProducts(name);
    res.json(rows);
}));

router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;
    const rows = await productService.searchProducts(q);
    res.json(rows);
}));

router.get('/', asyncHandler(async (req, res) => {
    const products = await productService.getProducts(req.query);
    res.json(products);
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    res.json(product);
}));

router.post('/', authenticateToken, isShop, asyncHandler(async (req, res) => {
    const product = await productService.addProduct(req.user.id, req.body);
    res.status(201).json({ message: 'Product added successfully', product });
}));

router.put('/:id', authenticateToken, isShop, asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.user.id, req.body);
    res.json({ message: 'Product updated successfully', product });
}));

router.put('/:id/stock', authenticateToken, isShop, asyncHandler(async (req, res) => {
    const product = await productService.updateProductStock(req.params.id, req.user.id, req.body.stock_quantity);
    res.json({ message: 'Stock updated successfully', product });
}));

router.post('/:id/images', authenticateToken, isShop, upload.array('images', 5), asyncHandler(async (req, res) => {
    const product = await productService.uploadProductImages(req.params.id, req.user.id, req.files);
    res.json({ message: 'Images uploaded successfully', images: product.images });
}));

router.delete('/:id/images', authenticateToken, isShop, asyncHandler(async (req, res) => {
    const product = await productService.deleteProductImage(req.params.id, req.user.id, req.body.imageUrl);
    res.json({ message: 'Image removed', images: product.images });
}));

module.exports = router;