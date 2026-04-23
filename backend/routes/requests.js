// backend/routes/requests.js
const express = require('express');
const AppError = require('../utils/AppError');
const { authenticateToken, isContractor, isShop, doubleCsrfProtection } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const requestService = require('../services/requestService');

const router = express.Router();

router.post('/', doubleCsrfProtection, authenticateToken, isContractor, asyncHandler(async (req, res) => {
    const result = await requestService.createRequest(req.user.id, req.body);
    res.status(201).json({
        message: result.requires_approval ? 'Request submitted and pending shop approval' : 'Request created successfully',
        request_id: result.request_id,
        total_amount: result.total_amount,
        requires_approval: result.requires_approval
    });
}));

router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    const requests = await requestService.getRequestsForUser(req.user.id, req.user.user_type);
    res.json(requests);
}));

router.put('/:id/status', doubleCsrfProtection, authenticateToken, isShop, asyncHandler(async (req, res) => {
    const result = await requestService.updateRequestStatus(req.user.id, req.params.id, req.body);
    res.json(result);
}));

router.put('/bulk/status', doubleCsrfProtection, authenticateToken, isShop, asyncHandler(async (req, res) => {
    const result = await requestService.bulkUpdateRequestStatus(req.user.id, req.body.request_ids, req.body.status);
    res.json(result);
}));

router.put('/:id/cancel', doubleCsrfProtection, authenticateToken, isContractor, asyncHandler(async (req, res) => {
    const result = await requestService.cancelRequest(req.user.id, req.params.id);
    res.json(result);
}));

router.post('/:id/dispute', doubleCsrfProtection, authenticateToken, isContractor, asyncHandler(async (req, res) => {
    const result = await requestService.disputeRequest(req.user.id, req.params.id, req.body.reason);
    res.json(result);
}));

router.put('/:id/partial-fulfill', doubleCsrfProtection, authenticateToken, isShop, asyncHandler(async (req, res) => {
    const result = await requestService.partialFulfillRequest(req.user.id, req.params.id, req.body.fulfilled_items, req.body.tracking_number, req.body.tracking_notes);
    res.json(result);
}));

router.put('/:id/approve', doubleCsrfProtection, authenticateToken, isShop, asyncHandler(async (req, res) => {
    const result = await requestService.approveRequest(req.user.id, req.params.id, req.body.approved, req.body.approval_notes);
    res.json(result);
}));

router.post('/admin/expire', doubleCsrfProtection, authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.user_type !== 'admin') {
        throw new AppError('Forbidden', 403);
    }
    const ids = await requestService.expirePendingRequests();
    res.json({ message: `${ids.length} expired requests cancelled`, ids });
}));

router.delete('/:id', doubleCsrfProtection, authenticateToken, asyncHandler(async (req, res) => {
    if (!['shop', 'contractor'].includes(req.user.user_type)) {
        throw new AppError('Access denied', 403);
    }
    const result = await requestService.deleteRequest(req.user.id, req.user.user_type, req.params.id);
    res.json(result);
}));

router.get('/addresses/saved', authenticateToken, asyncHandler(async (req, res) => {
    const addresses = await requestService.getSavedAddresses(req.user.id);
    res.json(addresses);
}));

router.post('/addresses/saved', doubleCsrfProtection, authenticateToken, asyncHandler(async (req, res) => {
    const address = await requestService.saveAddress(req.user.id, req.body);
    res.status(201).json(address);
}));

router.delete('/addresses/saved/:id', doubleCsrfProtection, authenticateToken, asyncHandler(async (req, res) => {
    const result = await requestService.deleteAddress(req.user.id, req.params.id);
    res.json(result);
}));

router.get('/drafts/list', authenticateToken, isContractor, asyncHandler(async (req, res) => {
    const drafts = await requestService.getDrafts(req.user.id);
    res.json(drafts);
}));

router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
    const request = await requestService.getRequestById(req.params.id, req.user.id, req.user.user_type);
    res.json(request);
}));

router.post('/drafts/save', doubleCsrfProtection, authenticateToken, isContractor, asyncHandler(async (req, res) => {
    const draft = await requestService.saveDraft(req.user.id, req.body);
    res.status(req.body.id ? 200 : 201).json(draft);
}));

router.delete('/drafts/:id', doubleCsrfProtection, authenticateToken, isContractor, asyncHandler(async (req, res) => {
    const result = await requestService.deleteDraft(req.user.id, req.params.id);
    res.json(result);
}));

module.exports = router;
