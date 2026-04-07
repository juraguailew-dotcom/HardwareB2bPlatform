// backend/routes/requests.js
const express = require('express');
const pool = require('../database/db');
const CURRENCY = require('../config/currency');
const { authenticateToken, isContractor, isShop, doubleCsrfProtection } = require('../middleware/auth');
const { notifyNewOrder: notifyNewRequest, notifyOrderStatus: notifyRequestStatus, notifyOrderApproval: notifyRequestApproval } = require('../utils/notifyAll');
const auditLog = require('../utils/audit');

const router = express.Router();

const APPROVAL_THRESHOLD = parseFloat(process.env.REQUEST_APPROVAL_THRESHOLD || 5000);
// Requests pending_approval expire after this many hours
const APPROVAL_EXPIRY_HOURS = parseInt(process.env.REQUEST_EXPIRY_HOURS || 48);

// ─── Create request (contractor only) ────────────────────────────────────────
router.post('/', doubleCsrfProtection, authenticateToken, isContractor, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { shop_id, items, delivery_address, delivery_date, notes, delivery_time, delivery_fee } = req.body;

        if (!shop_id || !items || items.length === 0)
            return res.status(400).json({ error: 'Shop ID and items are required' });

        let total_amount = 0;
        for (const item of items) {
            const productResult = await client.query(
                'SELECT * FROM products WHERE id = $1 AND shop_id = $2',
                [item.product_id, shop_id]
            );
            if (productResult.rows.length === 0) throw new Error(`Product ${item.product_id} not found`);
            const product = productResult.rows[0];
            if (product.stock_quantity < item.quantity)
                throw new Error(`Insufficient stock for ${product.name}`);

            const customPriceResult = await client.query(
                `SELECT custom_price FROM contractor_pricing WHERE shop_id=$1 AND contractor_id=$2 AND product_id=$3`,
                [shop_id, req.user.id, item.product_id]
            );
            const price = customPriceResult.rows.length > 0
                ? parseFloat(customPriceResult.rows[0].custom_price)
                : (item.quantity >= product.minimum_bulk_quantity ? product.bulk_price : product.unit_price);
            total_amount += price * item.quantity;
        }

        const requiresApproval = total_amount >= APPROVAL_THRESHOLD;
        const initialStatus = requiresApproval ? 'pending_approval' : 'pending';
        const expiresAt = requiresApproval
            ? new Date(Date.now() + APPROVAL_EXPIRY_HOURS * 3600 * 1000)
            : null;

        const requestResult = await client.query(
            `INSERT INTO requests (contractor_id, shop_id, total_amount, delivery_address, delivery_date, notes,
             delivery_time, delivery_fee, requires_approval, status, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [req.user.id, shop_id, total_amount, delivery_address, delivery_date, notes,
             delivery_time || null, delivery_fee || 0, requiresApproval, initialStatus, expiresAt]
        );
        const requestId = requestResult.rows[0].id;

        for (const item of items) {
            const productResult = await client.query('SELECT * FROM products WHERE id=$1', [item.product_id]);
            const product = productResult.rows[0];
            const customPriceResult = await client.query(
                `SELECT custom_price FROM contractor_pricing WHERE shop_id=$1 AND contractor_id=$2 AND product_id=$3`,
                [shop_id, req.user.id, item.product_id]
            );
            const price = customPriceResult.rows.length > 0
                ? parseFloat(customPriceResult.rows[0].custom_price)
                : (item.quantity >= product.minimum_bulk_quantity ? product.bulk_price : product.unit_price);

            await client.query(
                `INSERT INTO request_items (request_id, product_id, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5)`,
                [requestId, item.product_id, item.quantity, price, price * item.quantity]
            );
            await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }

        await client.query('COMMIT');
        await notifyNewRequest(shop_id, requestId, total_amount, requiresApproval);
        await auditLog(req.user.id, 'CREATE_REQUEST', 'request', requestId,
            { shop_id, total_amount, requires_approval: requiresApproval }, req.ip);

        res.status(201).json({
            message: requiresApproval ? 'Request submitted and pending shop approval' : 'Request created successfully',
            request_id: requestId, total_amount, requires_approval: requiresApproval
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating request:', error);
        res.status(500).json({ error: error.message || 'Failed to create request' });
    } finally {
        client.release();
    }
});

// ─── Get requests ─────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query, params = [req.user.id];
        if (req.user.user_type === 'contractor') {
            query = `SELECT r.*, u.company_name as shop_name
                     FROM requests r JOIN users u ON r.shop_id = u.id
                     WHERE r.contractor_id = $1 ORDER BY r.request_date DESC`;
        } else {
            query = `SELECT r.*, u.company_name as contractor_name
                     FROM requests r JOIN users u ON r.contractor_id = u.id
                     WHERE r.shop_id = $1 ORDER BY r.request_date DESC`;
        }
        const result = await pool.query(query, params);
        const requestsWithCurrency = result.rows.map(r => ({
            ...r, currency: CURRENCY.code, currency_symbol: CURRENCY.symbol,
            formatted_total: CURRENCY.format(r.total_amount)
        }));
        const requestIds = requestsWithCurrency.map(r => r.id);
        let allItems = [];
        if (requestIds.length > 0) {
            const itemsResult = await pool.query(
                `SELECT ri.*, p.name, p.unit_type FROM request_items ri JOIN products p ON ri.product_id = p.id WHERE ri.request_id = ANY($1)`,
                [requestIds]
            );
            allItems = itemsResult.rows;
        }
        for (const request of requestsWithCurrency) {
            request.items = allItems.filter(i => i.request_id === request.id);
        }
        res.json(requestsWithCurrency);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// ─── Get single request ────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const requestResult = await pool.query(
            `SELECT r.*, u_s.company_name as shop_name, u_c.company_name as contractor_name
             FROM requests r
             JOIN users u_s ON r.shop_id = u_s.id
             JOIN users u_c ON r.contractor_id = u_c.id
             WHERE r.id = $1`, [id]
        );
        if (requestResult.rows.length === 0)
            return res.status(404).json({ error: 'Request not found' });

        const request = requestResult.rows[0];
        const itemsResult = await pool.query(
            `SELECT ri.*, p.name, p.unit_type FROM request_items ri JOIN products p ON ri.product_id = p.id WHERE ri.request_id = $1`,
            [id]
        );
        request.items = itemsResult.rows;
        res.json({
            ...request, currency: CURRENCY.code, currency_symbol: CURRENCY.symbol,
            formatted_total: CURRENCY.format(request.total_amount),
            items: request.items.map(item => ({
                ...item, currency: CURRENCY.code, currency_symbol: CURRENCY.symbol,
                formatted_unit_price: CURRENCY.format(item.unit_price),
                formatted_subtotal: CURRENCY.format(item.subtotal)
            }))
        });
    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});

// ─── Update request status (shop only) ────────────────────────────────────────
router.put('/:id/status', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { status, tracking_notes, tracking_number } = req.body;

        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status))
            return res.status(400).json({ error: 'Invalid status' });

        const requestCheck = await client.query(
            'SELECT * FROM requests WHERE id=$1 AND shop_id=$2', [id, req.user.id]
        );
        if (requestCheck.rows.length === 0)
            return res.status(404).json({ error: 'Request not found or not authorized' });

        const prevRequest = requestCheck.rows[0];

        if (status === 'cancelled' && prevRequest.status !== 'cancelled') {
            const items = await client.query('SELECT product_id, quantity FROM request_items WHERE request_id=$1', [id]);
            for (const item of items.rows) {
                await client.query(
                    'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id=$2',
                    [item.quantity, item.product_id]
                );
            }
        }

        const trackingFields = { shipped: 'dispatched_at', delivered: 'delivered_at' };
        const tsField = trackingFields[status];
        const tsUpdate = tsField ? `, ${tsField} = NOW()` : '';
        const trackingNumUpdate = tracking_number ? `, tracking_number = $4` : '';
        const queryParams = tracking_number
            ? [status, tracking_notes || null, id, tracking_number]
            : [status, tracking_notes || null, id];

        const result = await client.query(
            `UPDATE requests SET status=$1, tracking_notes=COALESCE($2, tracking_notes)${tsUpdate}${trackingNumUpdate}
             WHERE id=$3 RETURNING *`,
            queryParams
        );

        await client.query('COMMIT');
        const request = result.rows[0];
        await notifyRequestStatus(request.contractor_id, id, status);
        await auditLog(req.user.id, 'UPDATE_REQUEST_STATUS', 'request', id, { status, tracking_number }, req.ip);
        res.json({ message: 'Request status updated', request });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating request:', error);
        res.status(500).json({ error: 'Failed to update request' });
    } finally {
        client.release();
    }
});

// ─── Bulk status update (shop only) ─────────────────────────────────────────
router.put('/bulk/status', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { request_ids, status } = req.body;
        const validStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status) || !Array.isArray(request_ids) || request_ids.length === 0)
            return res.status(400).json({ error: 'Invalid request' });

        // Verify all requests belong to this shop
        const check = await client.query(
            'SELECT id, status FROM requests WHERE id = ANY($1) AND shop_id = $2',
            [request_ids, req.user.id]
        );
        if (check.rows.length !== request_ids.length)
            return res.status(403).json({ error: 'Some requests not found or not authorized' });

        if (status === 'cancelled') {
            for (const request of check.rows) {
                if (request.status !== 'cancelled') {
                    const items = await client.query('SELECT product_id, quantity FROM request_items WHERE request_id=$1', [request.id]);
                    for (const item of items.rows) {
                        await client.query(
                            'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id=$2',
                            [item.quantity, item.product_id]
                        );
                    }
                }
            }
        }

        const trackingFields = { shipped: 'dispatched_at', delivered: 'delivered_at' };
        const tsField = trackingFields[status];
        const tsUpdate = tsField ? `, ${tsField} = NOW()` : '';

        await client.query(
            `UPDATE requests SET status=$1${tsUpdate} WHERE id = ANY($2) AND shop_id=$3`,
            [status, request_ids, req.user.id]
        );

        await client.query('COMMIT');
        await auditLog(req.user.id, 'BULK_UPDATE_REQUEST_STATUS', 'request', null, { request_ids, status }, req.ip);
        res.json({ message: `${request_ids.length} requests updated to ${status}` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error bulk updating requests:', error);
        res.status(500).json({ error: 'Failed to bulk update requests' });
    } finally {
        client.release();
    }
});

// ─── Contractor cancel (pending/pending_approval only) ───────────────────────
router.put('/:id/cancel', doubleCsrfProtection, authenticateToken, isContractor, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const requestCheck = await client.query(
            'SELECT * FROM requests WHERE id=$1 AND contractor_id=$2', [id, req.user.id]
        );
        if (requestCheck.rows.length === 0)
            return res.status(404).json({ error: 'Request not found' });

        const request = requestCheck.rows[0];
        if (!['pending', 'pending_approval'].includes(request.status))
            return res.status(400).json({ error: 'Only pending requests can be cancelled by contractor' });

        // Restore stock
        const items = await client.query('SELECT product_id, quantity FROM request_items WHERE request_id=$1', [id]);
        for (const item of items.rows) {
            await client.query(
                'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id=$2',
                [item.quantity, item.product_id]
            );
        }

        const result = await client.query(
            `UPDATE requests SET status='cancelled', cancelled_by=$1, cancelled_at=NOW() WHERE id=$2 RETURNING *`,
            [req.user.id, id]
        );

        await client.query('COMMIT');
        await notifyRequestStatus(request.shop_id, id, 'cancelled');
        await auditLog(req.user.id, 'CONTRACTOR_CANCEL_REQUEST', 'request', id, {}, req.ip);
        res.json({ message: 'Request cancelled', request: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error cancelling request:', error);
        res.status(500).json({ error: 'Failed to cancel request' });
    } finally {
        client.release();
    }
});

// ─── Dispute request (contractor only, delivered requests) ───────────────────────
router.post('/:id/dispute', doubleCsrfProtection, authenticateToken, isContractor, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'Dispute reason is required' });

        const requestCheck = await pool.query(
            'SELECT * FROM requests WHERE id=$1 AND contractor_id=$2', [id, req.user.id]
        );
        if (requestCheck.rows.length === 0)
            return res.status(404).json({ error: 'Request not found' });

        const request = requestCheck.rows[0];
        if (request.status !== 'delivered')
            return res.status(400).json({ error: 'Only delivered requests can be disputed' });
        if (request.dispute_status)
            return res.status(400).json({ error: 'A dispute already exists for this request' });

        const result = await pool.query(
            `UPDATE requests SET dispute_reason=$1, dispute_status='open', disputed_at=NOW() WHERE id=$2 RETURNING *`,
            [reason, id]
        );

        await auditLog(req.user.id, 'DISPUTE_REQUEST', 'request', id, { reason }, req.ip);
        res.json({ message: 'Dispute submitted', request: result.rows[0] });
    } catch (error) {
        console.error('Error submitting dispute:', error);
        res.status(500).json({ error: 'Failed to submit dispute' });
    }
});

// ─── Partial fulfillment (shop only) ─────────────────────────────────────────
router.put('/:id/partial-fulfill', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { fulfilled_items, tracking_number, tracking_notes } = req.body;
        // fulfilled_items: [{ request_item_id, fulfilled_quantity }]

        if (!Array.isArray(fulfilled_items) || fulfilled_items.length === 0)
            return res.status(400).json({ error: 'fulfilled_items required' });

        const requestCheck = await client.query(
            'SELECT * FROM requests WHERE id=$1 AND shop_id=$2', [id, req.user.id]
        );
        if (requestCheck.rows.length === 0)
            return res.status(404).json({ error: 'Request not found or not authorized' });

        for (const fi of fulfilled_items) {
            const itemCheck = await client.query(
                'SELECT * FROM request_items WHERE id=$1 AND request_id=$2', [fi.request_item_id, id]
            );
            if (itemCheck.rows.length === 0) continue;
            const item = itemCheck.rows[0];
            const diff = item.quantity - fi.fulfilled_quantity;
            if (diff > 0) {
                // Restore unfulfilled stock
                await client.query(
                    'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id=$2',
                    [diff, item.product_id]
                );
            }
            await client.query(
                'UPDATE request_items SET quantity=$1, subtotal=unit_price*$1 WHERE id=$2',
                [fi.fulfilled_quantity, fi.request_item_id]
            );
        }

        // Recalculate total
        const totals = await client.query(
            'SELECT SUM(subtotal) as new_total FROM request_items WHERE request_id=$1', [id]
        );
        const newTotal = totals.rows[0].new_total || 0;

        const result = await client.query(
            `UPDATE requests SET status='shipped', partial_fulfilled=true, total_amount=$1,
             tracking_number=COALESCE($2, tracking_number), tracking_notes=COALESCE($3, tracking_notes),
             dispatched_at=NOW() WHERE id=$4 RETURNING *`,
            [newTotal, tracking_number || null, tracking_notes || null, id]
        );

        await client.query('COMMIT');
        const request = result.rows[0];
        await notifyRequestStatus(request.contractor_id, id, 'shipped');
        await auditLog(req.user.id, 'PARTIAL_FULFILL_REQUEST', 'request', id, { fulfilled_items }, req.ip);
        res.json({ message: 'Request partially fulfilled and marked as shipped', request });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error partial fulfilling request:', error);
        res.status(500).json({ error: 'Failed to partially fulfill request' });
    } finally {
        client.release();
    }
});

// ─── Approve / reject large request (shop only) ────────────────────────────────
router.put('/:id/approve', doubleCsrfProtection, authenticateToken, isShop, async (req, res) => {
    try {
        const { id } = req.params;
        const { approved, approval_notes } = req.body;

        const requestCheck = await pool.query(
            `SELECT * FROM requests WHERE id=$1 AND shop_id=$2 AND requires_approval=true`, [id, req.user.id]
        );
        if (requestCheck.rows.length === 0)
            return res.status(404).json({ error: 'Request not found or does not require approval' });

        const newStatus = approved ? 'pending' : 'cancelled';
        const result = await pool.query(
            `UPDATE requests SET status=$1, approved_by=$2, approved_at=NOW(), approval_notes=$3 WHERE id=$4 RETURNING *`,
            [newStatus, req.user.id, approval_notes || null, id]
        );

        const request = result.rows[0];
        await notifyRequestApproval(request.contractor_id, id, approved, approval_notes);
        await auditLog(req.user.id, approved ? 'APPROVE_REQUEST' : 'REJECT_REQUEST', 'request', id, { approval_notes }, req.ip);
        res.json({ message: `Request ${approved ? 'approved' : 'rejected'}`, request });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ error: 'Failed to process approval' });
    }
});

// ─── Expire stale pending_approval requests (called by cron or on-demand) ──────
router.post('/admin/expire', doubleCsrfProtection, authenticateToken, async (req, res) => {
    if (req.user.user_type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        const result = await pool.query(
            `UPDATE requests SET status='cancelled', cancelled_at=NOW()
             WHERE status='pending_approval' AND expires_at IS NOT NULL AND expires_at < NOW()
             RETURNING id`
        );
        res.json({ message: `${result.rows.length} expired requests cancelled`, ids: result.rows.map(r => r.id) });
    } catch (error) {
        console.error('Error expiring requests:', error);
        res.status(500).json({ error: 'Failed to expire requests' });
    }
});

// ─── Address book ─────────────────────────────────────────────────────────────
router.get('/addresses/saved', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM saved_addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
});

router.post('/addresses/saved', doubleCsrfProtection, authenticateToken, async (req, res) => {
    try {
        const { label, address, is_default } = req.body;
        if (!label || !address) return res.status(400).json({ error: 'Label and address required' });
        if (is_default) {
            await pool.query('UPDATE saved_addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
        }
        const result = await pool.query(
            'INSERT INTO saved_addresses (user_id, label, address, is_default) VALUES ($1,$2,$3,$4) RETURNING *',
            [req.user.id, label, address, is_default || false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save address' });
    }
});

router.delete('/addresses/saved/:id', doubleCsrfProtection, authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM saved_addresses WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        res.json({ message: 'Address deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete address' });
    }
});

// ─── Request drafts ─────────────────────────────────────────────────────────────
router.get('/drafts/list', authenticateToken, isContractor, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM request_drafts WHERE contractor_id=$1 ORDER BY updated_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

router.post('/drafts/save', doubleCsrfProtection, authenticateToken, isContractor, async (req, res) => {
    try {
        const { id, shop_id, shop_name, items, delivery_address, delivery_date, delivery_time, notes } = req.body;
        if (id) {
            const result = await pool.query(
                `UPDATE request_drafts SET shop_id=$1, shop_name=$2, items=$3, delivery_address=$4,
                 delivery_date=$5, delivery_time=$6, notes=$7, updated_at=NOW()
                 WHERE id=$8 AND contractor_id=$9 RETURNING *`,
                [shop_id, shop_name, JSON.stringify(items || []), delivery_address, delivery_date,
                 delivery_time, notes, id, req.user.id]
            );
            return res.json(result.rows[0]);
        }
        const result = await pool.query(
            `INSERT INTO request_drafts (contractor_id, shop_id, shop_name, items, delivery_address, delivery_date, delivery_time, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [req.user.id, shop_id, shop_name, JSON.stringify(items || []), delivery_address, delivery_date, delivery_time, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

router.delete('/drafts/:id', doubleCsrfProtection, authenticateToken, isContractor, async (req, res) => {
    try {
        await pool.query('DELETE FROM request_drafts WHERE id=$1 AND contractor_id=$2', [req.params.id, req.user.id]);
        res.json({ message: 'Draft deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

module.exports = router;
