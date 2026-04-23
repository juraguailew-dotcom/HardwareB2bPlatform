const AppError = require('../utils/AppError');
const requestRepository = require('../repositories/requestRepository');
const { notifyNewOrder, notifyOrderStatus, notifyOrderApproval } = require('../utils/notifyAll');
const auditLog = require('../utils/audit');
const CURRENCY = require('../config/currency');

const APPROVAL_THRESHOLD = parseFloat(process.env.REQUEST_APPROVAL_THRESHOLD || 5000);
const APPROVAL_EXPIRY_HOURS = parseInt(process.env.REQUEST_EXPIRY_HOURS || 48, 10);

const resolveCustomPrice = async (client, shopId, contractorId, productId, defaultPrice) => {
    const customPriceResult = await requestRepository.getCustomPrice(client, shopId, contractorId, productId);
    if (customPriceResult.rows.length > 0) {
        const customPrice = Number(customPriceResult.rows[0].custom_price);
        return Number.isFinite(customPrice) ? customPrice : defaultPrice;
    }
    return defaultPrice;
};

const buildProductPricing = async (client, shopId, contractorId, product, quantity) => {
    if (product.stock_quantity < quantity) {
        throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }
    const isBulk = product.bulk_price && product.minimum_bulk_quantity && quantity >= product.minimum_bulk_quantity;
    const basePrice = isBulk ? Number(product.bulk_price) : Number(product.unit_price);
    return resolveCustomPrice(client, shopId, contractorId, product.id, basePrice);
};

const calculateRequestTotal = async (client, shopId, contractorId, items) => {
    let totalAmount = 0;
    const priceMap = [];
    for (const item of items) {
        const productResult = await requestRepository.getProductById(client, item.product_id, shopId);
        if (productResult.rows.length === 0) {
            throw new AppError(`Product ${item.product_id} not found`, 400);
        }
        const product = productResult.rows[0];
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new AppError('Each request item must contain a valid quantity', 400);
        }
        const price = await buildProductPricing(client, shopId, contractorId, product, quantity);
        totalAmount += price * quantity;
        priceMap.push({ product, quantity, unit_price: price, subtotal: price * quantity });
    }
    return { totalAmount, priceMap };
};

const createRequest = async (contractorId, payload) => {
    const { shop_id, items, delivery_address, delivery_date, notes, delivery_time, delivery_fee } = payload;
    if (!shop_id || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Shop ID and items are required', 400);
    }

    const client = await require('../database/db').connect();
    try {
        await client.query('BEGIN');

        const { totalAmount, priceMap } = await calculateRequestTotal(client, shop_id, contractorId, items);
        const requiresApproval = totalAmount >= APPROVAL_THRESHOLD;
        const initialStatus = requiresApproval ? 'pending_approval' : 'pending';
        const expiresAt = requiresApproval
            ? new Date(Date.now() + APPROVAL_EXPIRY_HOURS * 3600 * 1000)
            : null;

        const insertResult = await requestRepository.insertRequest(client, {
            contractor_id: contractorId,
            shop_id,
            total_amount: totalAmount,
            delivery_address,
            delivery_date,
            notes,
            delivery_time: delivery_time || null,
            delivery_fee: Number(delivery_fee) || 0,
            requires_approval: requiresApproval,
            initial_status: initialStatus,
            expires_at: expiresAt
        });

        const requestId = insertResult.rows[0].id;

        for (const entry of priceMap) {
            await requestRepository.insertRequestItem(client, requestId, {
                product_id: entry.product.id,
                quantity: entry.quantity,
                unit_price: entry.unit_price,
                subtotal: entry.subtotal
            });
            await requestRepository.updateProductStock(client, entry.product.id, -entry.quantity);
        }

        await client.query('COMMIT');
        await notifyNewOrder(shop_id, requestId, totalAmount, requiresApproval);
        await auditLog(contractorId, 'CREATE_REQUEST', 'request', requestId,
            { shop_id, total_amount: totalAmount, requires_approval: requiresApproval },
            null);

        return {
            request_id: requestId,
            total_amount: totalAmount,
            requires_approval: requiresApproval,
            status: requiresApproval ? 'pending_approval' : 'pending'
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getRequestsForUser = async (userId, userType) => {
    const result = await requestRepository.getRequestsForUser(userId, userType);
    const requestsWithCurrency = result.rows.map(r => ({
        ...r,
        currency: CURRENCY.code,
        currency_symbol: CURRENCY.symbol,
        formatted_total: CURRENCY.format(r.total_amount)
    }));

    if (requestsWithCurrency.length === 0) {
        return requestsWithCurrency;
    }

    const ids = requestsWithCurrency.map((request) => request.id);
    const itemsResult = await requestRepository.getRequestItemsByRequestIds(ids);

    const itemsByRequest = itemsResult.rows.reduce((acc, item) => {
        acc[item.request_id] = acc[item.request_id] || [];
        acc[item.request_id].push(item);
        return acc;
    }, {});

    return requestsWithCurrency.map((request) => ({
        ...request,
        items: (itemsByRequest[request.id] || []).map(item => ({
            ...item,
            currency: CURRENCY.code,
            currency_symbol: CURRENCY.symbol,
            formatted_unit_price: CURRENCY.format(item.unit_price),
            formatted_subtotal: CURRENCY.format(item.subtotal)
        }))
    }));
};

const getRequestById = async (id, userId, userType) => {
    const result = await requestRepository.getRequestByIdForUser(id, userId, userType);
    if (result.rows.length === 0) {
        throw new AppError('Request not found', 404);
    }

    const request = result.rows[0];
    const itemsResult = await requestRepository.getRequestItemsByRequestId(id);
    const items = itemsResult.rows.map(item => ({
        ...item,
        currency: CURRENCY.code,
        currency_symbol: CURRENCY.symbol,
        formatted_unit_price: CURRENCY.format(item.unit_price),
        formatted_subtotal: CURRENCY.format(item.subtotal)
    }));

    return {
        ...request,
        currency: CURRENCY.code,
        currency_symbol: CURRENCY.symbol,
        formatted_total: CURRENCY.format(request.total_amount),
        items
    };
};

const updateRequestStatus = async (shopId, id, payload) => {
    const { status, tracking_notes, tracking_number } = payload;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        throw new AppError('Invalid status', 400);
    }

    const requestResult = await requestRepository.getRequestByIdForShop(id, shopId);
    if (requestResult.rows.length === 0) {
        throw new AppError('Request not found or not authorized', 404);
    }

    const previous = requestResult.rows[0];
    const client = await require('../database/db').connect();

    try {
        await client.query('BEGIN');
        if (status === 'cancelled' && previous.status !== 'cancelled') {
            const items = await requestRepository.getRequestItemsByRequestId(id);
            for (const item of items.rows) {
                await requestRepository.updateProductStock(client, item.product_id, item.quantity);
            }
        }

        const fields = {
            status,
            tracking_notes: tracking_notes || previous.tracking_notes,
            tracking_number: tracking_number !== undefined ? tracking_number : previous.tracking_number
        };

        if (status === 'shipped') {
            fields.dispatched_at = new Date();
        }
        if (status === 'delivered') {
            fields.delivered_at = new Date();
        }

        const updatedRequest = await requestRepository.updateRequest(client, id, fields);
        await client.query('COMMIT');
        await notifyOrderStatus(previous.contractor_id, id, status);
        await auditLog(shopId, 'UPDATE_REQUEST_STATUS', 'request', id, { status, tracking_number }, null);

        return { message: 'Request status updated', request: updatedRequest.rows[0] };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const bulkUpdateRequestStatus = async (shopId, requestIds, status) => {
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
        throw new AppError('request_ids must be a non-empty array', 400);
    }

    const validStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        throw new AppError('Invalid status', 400);
    }

    const check = await requestRepository.getRequestsByIdsForShop(requestIds, shopId);
    if (check.rows.length !== requestIds.length) {
        throw new AppError('Some requests not found or not authorized', 403);
    }

    const client = await require('../database/db').connect();
    try {
        await client.query('BEGIN');
        if (status === 'cancelled') {
            for (const request of check.rows) {
                if (request.status !== 'cancelled') {
                    const items = await requestRepository.getRequestItemsByRequestId(request.id);
                    for (const item of items.rows) {
                        await requestRepository.updateProductStock(client, item.product_id, item.quantity);
                    }
                }
            }
        }

        const trackingFields = { shipped: 'dispatched_at', delivered: 'delivered_at' };
        const fields = {};
        if (trackingFields[status]) {
            fields[trackingFields[status]] = new Date();
        }

        await requestRepository.updateRequestsStatus(client, status, requestIds, shopId, fields);
        await client.query('COMMIT');
        await auditLog(shopId, 'BULK_UPDATE_REQUEST_STATUS', 'request', null, { request_ids: requestIds, status }, null);
        return { message: `${requestIds.length} requests updated to ${status}` };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const cancelRequest = async (contractorId, id) => {
    const requestResult = await requestRepository.getRequestByIdForContractor(id, contractorId);
    if (requestResult.rows.length === 0) {
        throw new AppError('Request not found or not authorized', 404);
    }

    const request = requestResult.rows[0];
    if (!['pending', 'pending_approval'].includes(request.status)) {
        throw new AppError('Only pending requests can be cancelled by contractor', 400);
    }

    const client = await require('../database/db').connect();
    try {
        await client.query('BEGIN');
        const items = await requestRepository.getRequestItemsByRequestId(id);
        for (const item of items.rows) {
            await requestRepository.updateProductStock(client, item.product_id, item.quantity);
        }

        const updated = await requestRepository.updateRequest(client, id, {
            status: 'cancelled',
            cancelled_by: contractorId,
            cancelled_at: new Date()
        });

        await client.query('COMMIT');
        await notifyOrderStatus(request.shop_id, id, 'cancelled');
        await auditLog(contractorId, 'CONTRACTOR_CANCEL_REQUEST', 'request', id, {}, null);
        return { message: 'Request cancelled', request: updated.rows[0] };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const disputeRequest = async (contractorId, id, reason) => {
    if (!reason) {
        throw new AppError('Dispute reason is required', 400);
    }

    const requestResult = await requestRepository.getRequestByIdForContractor(id, contractorId);
    if (requestResult.rows.length === 0) {
        throw new AppError('Request not found or not authorized', 404);
    }

    const request = requestResult.rows[0];
    if (request.status !== 'delivered') {
        throw new AppError('Only delivered requests can be disputed', 400);
    }
    if (request.dispute_status) {
        throw new AppError('A dispute already exists for this request', 400);
    }

    const updated = await requestRepository.updateRequest(null, id, {
        dispute_reason: reason,
        dispute_status: 'open',
        disputed_at: new Date()
    });

    await auditLog(contractorId, 'DISPUTE_REQUEST', 'request', id, { reason }, null);
    return { message: 'Dispute submitted', request: updated.rows[0] };
};

const partialFulfillRequest = async (shopId, id, fulfilled_items, tracking_number, tracking_notes) => {
    if (!Array.isArray(fulfilled_items) || fulfilled_items.length === 0) {
        throw new AppError('fulfilled_items required', 400);
    }

    const requestResult = await requestRepository.getRequestByIdForShop(id, shopId);
    if (requestResult.rows.length === 0) {
        throw new AppError('Request not found or not authorized', 404);
    }

    const client = await require('../database/db').connect();
    try {
        await client.query('BEGIN');

        for (const fi of fulfilled_items) {
            const itemCheck = await requestRepository.getRequestItemById(fi.request_item_id, id);
            if (itemCheck.rows.length === 0) continue;
            const item = itemCheck.rows[0];
            const fulfilledQuantity = Number(fi.fulfilled_quantity);
            if (!Number.isFinite(fulfilledQuantity) || fulfilledQuantity < 0) {
                throw new AppError('Each fulfilled item must include a valid fulfilled_quantity', 400);
            }
            if (fulfilledQuantity > item.quantity) {
                throw new AppError('Fulfilled quantity cannot exceed requested quantity', 400);
            }

            const diff = item.quantity - fulfilledQuantity;
            if (diff > 0) {
                await requestRepository.updateProductStock(client, item.product_id, diff);
            }

            await requestRepository.updateRequestItem(client, item.id, {
                quantity: fulfilledQuantity,
                subtotal: item.unit_price * fulfilledQuantity
            });
        }

        const totalResult = await requestRepository.getRequestItemsTotal(id);
        const newTotal = Number(totalResult.rows[0].total) || 0;

        const updated = await requestRepository.updateRequest(client, id, {
            status: 'shipped',
            partial_fulfilled: true,
            total_amount: newTotal,
            tracking_number: tracking_number || requestResult.rows[0].tracking_number,
            tracking_notes: tracking_notes || requestResult.rows[0].tracking_notes,
            dispatched_at: new Date()
        });

        await client.query('COMMIT');
        await notifyOrderStatus(requestResult.rows[0].contractor_id, id, 'shipped');
        await auditLog(shopId, 'PARTIAL_FULFILL_REQUEST', 'request', id, { fulfilled_items }, null);
        return { message: 'Request partially fulfilled and marked as shipped', request: updated.rows[0] };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const approveRequest = async (shopId, id, approved, approval_notes) => {
    const requestResult = await requestRepository.getRequestByIdForShop(id, shopId);
    if (requestResult.rows.length === 0) {
        throw new AppError('Request not found or does not require approval', 404);
    }

    const request = requestResult.rows[0];
    if (!request.requires_approval) {
        throw new AppError('Request does not require approval', 400);
    }

    const status = approved ? 'pending' : 'cancelled';
    const updated = await requestRepository.updateRequest(null, id, {
        status,
        approved_by: shopId,
        approved_at: new Date(),
        approval_notes: approval_notes || null
    });

    await notifyOrderApproval(request.contractor_id, id, approved, approval_notes);
    await auditLog(shopId, approved ? 'APPROVE_REQUEST' : 'REJECT_REQUEST', 'request', id, { approval_notes }, null);
    return { message: `Request ${approved ? 'approved' : 'rejected'}`, request: updated.rows[0] };
};

const expirePendingRequests = async () => {
    const result = await requestRepository.expirePendingRequests();
    return result.rows.map(r => r.id);
};

const deleteRequest = async (userId, userType, id) => {
    const requestResult = userType === 'shop'
        ? await requestRepository.getRequestByIdForShop(id, userId)
        : await requestRepository.getRequestByIdForContractor(id, userId);

    if (requestResult.rows.length === 0) {
        throw new AppError('Request not found or not authorized', 404);
    }

    const request = requestResult.rows[0];
    if (request.status !== 'cancelled') {
        throw new AppError('Only cancelled requests can be deleted', 400);
    }

    await requestRepository.deleteRequestItemsByRequestId(id);
    await requestRepository.deleteRequestById(id);
    await auditLog(userId, 'DELETE_REQUEST', 'request', id, {}, null);
    return { message: 'Request deleted' };
};

const getSavedAddresses = async (userId) => {
    const result = await requestRepository.getSavedAddresses(userId);
    return result.rows;
};

const saveAddress = async (userId, addressPayload) => {
    const { label, address, is_default } = addressPayload;
    if (!label || !address) {
        throw new AppError('Label and address required', 400);
    }
    if (is_default) {
        await requestRepository.resetSavedAddressDefaults(userId);
    }
    const result = await requestRepository.createSavedAddress(userId, label, address, Boolean(is_default));
    return result.rows[0];
};

const deleteAddress = async (userId, addressId) => {
    await requestRepository.deleteSavedAddress(userId, addressId);
    return { message: 'Address deleted' };
};

const getDrafts = async (contractorId) => {
    const result = await requestRepository.getDraftsByContractor(contractorId);
    return result.rows;
};

const saveDraft = async (contractorId, draftPayload) => {
    const { id, shop_id, shop_name, items, delivery_address, delivery_date, delivery_time, notes } = draftPayload;
    if (id) {
        const result = await requestRepository.updateDraft(id, contractorId, {
            shop_id,
            shop_name,
            items,
            delivery_address,
            delivery_date,
            delivery_time,
            notes
        });
        if (result.rows.length === 0) {
            throw new AppError('Draft not found', 404);
        }
        return result.rows[0];
    }
    const result = await requestRepository.insertDraft(contractorId, {
        shop_id,
        shop_name,
        items,
        delivery_address,
        delivery_date,
        delivery_time,
        notes
    });
    return result.rows[0];
};

const deleteDraft = async (contractorId, draftId) => {
    await requestRepository.deleteDraft(draftId, contractorId);
    return { message: 'Draft deleted' };
};

module.exports = {
    createRequest,
    getRequestsForUser,
    getRequestById,
    updateRequestStatus,
    bulkUpdateRequestStatus,
    cancelRequest,
    disputeRequest,
    partialFulfillRequest,
    approveRequest,
    expirePendingRequests,
    deleteRequest,
    getSavedAddresses,
    saveAddress,
    deleteAddress,
    getDrafts,
    saveDraft,
    deleteDraft,
};
