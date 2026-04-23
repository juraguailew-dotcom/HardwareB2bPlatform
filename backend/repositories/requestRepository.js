const pool = require('../database/db');

const run = (client, sql, params = []) => (client || pool).query(sql, params);

const getProductById = (client, productId, shopId) => {
    const sql = shopId
        ? 'SELECT * FROM products WHERE id = $1 AND shop_id = $2'
        : 'SELECT * FROM products WHERE id = $1';
    const params = shopId ? [productId, shopId] : [productId];
    return run(client, sql, params);
};

const getCustomPrice = (client, shopId, contractorId, productId) => {
    return run(client,
        `SELECT custom_price FROM contractor_pricing
         WHERE shop_id = $1 AND contractor_id = $2 AND product_id = $3`,
        [shopId, contractorId, productId]
    );
};

const insertRequest = (client, requestData) => {
    const {
        contractor_id, shop_id, total_amount, delivery_address,
        delivery_date, notes, delivery_time, delivery_fee,
        requires_approval, initial_status, expires_at
    } = requestData;

    return run(client,
        `INSERT INTO requests (
            contractor_id, shop_id, total_amount, delivery_address,
            delivery_date, notes, delivery_time, delivery_fee,
            requires_approval, status, expires_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
            contractor_id, shop_id, total_amount, delivery_address,
            delivery_date, notes, delivery_time, delivery_fee,
            requires_approval, initial_status, expires_at
        ]
    );
};

const insertRequestItem = (client, requestId, item) => {
    return run(client,
        `INSERT INTO request_items (request_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [requestId, item.product_id, item.quantity, item.unit_price, item.subtotal]
    );
};

const updateProductStock = (client, productId, quantityChange) => {
    return run(client,
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2 RETURNING *',
        [quantityChange, productId]
    );
};

const updateRecordById = (client, tableName, idField, idValue, fields) => {
    const keys = Object.keys(fields);
    if (keys.length === 0) {
        throw new Error('No fields provided for update');
    }

    const values = keys.map(key => fields[key]);
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    return run(client,
        `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = $${keys.length + 1} RETURNING *`,
        [...values, idValue]
    );
};

const getRequestsForUser = (userId, userType) => {
    if (userType === 'contractor') {
        return pool.query(
            `SELECT r.*, COALESCE(u.company_name, u.email) AS shop_name
             FROM requests r
             JOIN users u ON r.shop_id = u.id
             WHERE r.contractor_id = $1 ORDER BY r.request_date DESC`,
            [userId]
        );
    }

    if (userType === 'shop') {
        return pool.query(
            `SELECT r.*, u.company_name AS contractor_name
             FROM requests r
             JOIN users u ON r.contractor_id = u.id
             WHERE r.shop_id = $1 ORDER BY r.request_date DESC`,
            [userId]
        );
    }

    return pool.query(
        `SELECT r.*, u_s.company_name AS shop_name, u_c.company_name AS contractor_name
         FROM requests r
         JOIN users u_s ON r.shop_id = u_s.id
         JOIN users u_c ON r.contractor_id = u_c.id
         ORDER BY r.request_date DESC`,
        []
    );
};

const getRequestById = (requestId) => {
    return run(null,
        `SELECT r.*, u_s.company_name AS shop_name, u_c.company_name AS contractor_name
         FROM requests r
         JOIN users u_s ON r.shop_id = u_s.id
         JOIN users u_c ON r.contractor_id = u_c.id
         WHERE r.id = $1`,
        [requestId]
    );
};

const getRequestByIdForUser = (requestId, userId, userType) => {
    if (userType === 'shop') {
        return run(null,
            `SELECT r.*, u_s.company_name AS shop_name, u_c.company_name AS contractor_name
             FROM requests r
             JOIN users u_s ON r.shop_id = u_s.id
             JOIN users u_c ON r.contractor_id = u_c.id
             WHERE r.id = $1 AND r.shop_id = $2`,
            [requestId, userId]
        );
    }

    if (userType === 'contractor') {
        return run(null,
            `SELECT r.*, u_s.company_name AS shop_name, u_c.company_name AS contractor_name
             FROM requests r
             JOIN users u_s ON r.shop_id = u_s.id
             JOIN users u_c ON r.contractor_id = u_c.id
             WHERE r.id = $1 AND r.contractor_id = $2`,
            [requestId, userId]
        );
    }

    return run(null,
        `SELECT r.*, u_s.company_name AS shop_name, u_c.company_name AS contractor_name
         FROM requests r
         JOIN users u_s ON r.shop_id = u_s.id
         JOIN users u_c ON r.contractor_id = u_c.id
         WHERE r.id = $1`,
        [requestId]
    );
};

const getRequestByIdForShop = (requestId, shopId) => {
    return run(null,
        `SELECT r.*
         FROM requests r
         WHERE r.id = $1 AND r.shop_id = $2`,
        [requestId, shopId]
    );
};

const getRequestByIdForContractor = (requestId, contractorId) => {
    return run(null,
        `SELECT r.*
         FROM requests r
         WHERE r.id = $1 AND r.contractor_id = $2`,
        [requestId, contractorId]
    );
};

const getRequestItemsByRequestId = (requestId) => {
    return run(null,
        `SELECT ri.*,
                p.name,
                p.unit_type,
                CASE WHEN ri.unit_price = 0 OR ri.unit_price IS NULL THEN p.unit_price ELSE ri.unit_price END AS unit_price,
                CASE WHEN ri.subtotal = 0 OR ri.subtotal IS NULL
                     THEN (CASE WHEN ri.unit_price = 0 OR ri.unit_price IS NULL THEN p.unit_price ELSE ri.unit_price END) * ri.quantity
                     ELSE ri.subtotal
                END AS subtotal
         FROM request_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.request_id = $1`,
        [requestId]
    );
};

const getRequestItemsByRequestIds = (requestIds) => {
    return run(null,
        `SELECT ri.*,
                p.name,
                p.unit_type,
                CASE WHEN ri.unit_price = 0 OR ri.unit_price IS NULL THEN p.unit_price ELSE ri.unit_price END AS unit_price,
                CASE WHEN ri.subtotal = 0 OR ri.subtotal IS NULL
                     THEN (CASE WHEN ri.unit_price = 0 OR ri.unit_price IS NULL THEN p.unit_price ELSE ri.unit_price END) * ri.quantity
                     ELSE ri.subtotal
                END AS subtotal
         FROM request_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.request_id = ANY($1)`,
        [requestIds]
    );
};

const getRequestItemById = (requestItemId, requestId) => {
    return run(null,
        `SELECT * FROM request_items WHERE id = $1 AND request_id = $2`,
        [requestItemId, requestId]
    );
};

const getRequestsByIdsForShop = (requestIds, shopId) => {
    return run(null,
        `SELECT id, status FROM requests WHERE id = ANY($1) AND shop_id = $2`,
        [requestIds, shopId]
    );
};

const updateRequest = (client, requestId, fields) => updateRecordById(client, 'requests', 'id', requestId, fields);

const updateRequestItem = (client, requestItemId, fields) => updateRecordById(client, 'request_items', 'id', requestItemId, fields);

const updateRequestsStatus = (client, status, requestIds, shopId, extraFields = {}) => {
    const fieldEntries = Object.entries(extraFields);
    let setClause = 'status = $1';
    const values = [status];
    fieldEntries.forEach(([field, value], index) => {
        setClause += `, ${field} = $${index + 2}`;
        values.push(value);
    });
    values.push(requestIds, shopId);
    const requestIndex = values.length - 1;
    const shopIndex = values.length;
    return run(client,
        `UPDATE requests SET ${setClause} WHERE id = ANY($${requestIndex}) AND shop_id = $${shopIndex}`,
        values
    );
};

const getRequestItemsTotal = (requestId) => run(null,
    `SELECT SUM(subtotal) as total FROM request_items WHERE request_id = $1`,
    [requestId]
);

const expirePendingRequests = () => run(null,
    `UPDATE requests SET status='cancelled', cancelled_at=NOW()
     WHERE status='pending_approval' AND expires_at IS NOT NULL AND expires_at < NOW()
     RETURNING id`,
    []
);

const deleteRequestItemsByRequestId = (requestId) => run(null,
    'DELETE FROM request_items WHERE request_id = $1',
    [requestId]
);

const deleteRequestById = (requestId) => run(null,
    'DELETE FROM requests WHERE id = $1',
    [requestId]
);

const getSavedAddresses = (userId) => run(null,
    'SELECT * FROM saved_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [userId]
);

const createSavedAddress = (userId, label, address, isDefault) => run(null,
    `INSERT INTO saved_addresses (user_id, label, address, is_default)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, label, address, isDefault]
);

const resetSavedAddressDefaults = (userId) => run(null,
    'UPDATE saved_addresses SET is_default = false WHERE user_id = $1',
    [userId]
);

const deleteSavedAddress = (userId, addressId) => run(null,
    'DELETE FROM saved_addresses WHERE id = $1 AND user_id = $2',
    [addressId, userId]
);

const getDraftsByContractor = (contractorId) => run(null,
    'SELECT * FROM request_drafts WHERE contractor_id = $1 ORDER BY updated_at DESC',
    [contractorId]
);

const insertDraft = (contractorId, draft) => run(null,
    `INSERT INTO request_drafts (contractor_id, shop_id, shop_name, items, delivery_address, delivery_date, delivery_time, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [contractorId, draft.shop_id, draft.shop_name, JSON.stringify(draft.items || []), draft.delivery_address,
     draft.delivery_date, draft.delivery_time, draft.notes]
);

const updateDraft = (draftId, contractorId, draft) => run(null,
    `UPDATE request_drafts SET shop_id=$1, shop_name=$2, items=$3, delivery_address=$4,
     delivery_date=$5, delivery_time=$6, notes=$7, updated_at=NOW()
     WHERE id=$8 AND contractor_id=$9 RETURNING *`,
    [draft.shop_id, draft.shop_name, JSON.stringify(draft.items || []), draft.delivery_address,
     draft.delivery_date, draft.delivery_time, draft.notes, draftId, contractorId]
);

const deleteDraft = (draftId, contractorId) => run(null,
    'DELETE FROM request_drafts WHERE id=$1 AND contractor_id=$2',
    [draftId, contractorId]
);

module.exports = {
    getProductById,
    getCustomPrice,
    insertRequest,
    insertRequestItem,
    updateProductStock,
    getRequestsForUser,
    getRequestById,
    getRequestByIdForUser,
    getRequestByIdForShop,
    getRequestByIdForContractor,
    getRequestItemsByRequestId,
    getRequestItemsByRequestIds,
    getRequestItemById,
    getRequestsByIdsForShop,
    updateRequest,
    updateRequestItem,
    updateRequestsStatus,
    getRequestItemsTotal,
    expirePendingRequests,
    deleteRequestItemsByRequestId,
    deleteRequestById,
    getSavedAddresses,
    createSavedAddress,
    resetSavedAddressDefaults,
    deleteSavedAddress,
    getDraftsByContractor,
    insertDraft,
    updateDraft,
    deleteDraft,
};
