// backend/routes/analytics.js
const express = require('express');
const pool = require('../database/db');
const CURRENCY = require('../config/currency');
const { authenticateToken, isShop } = require('../middleware/auth');

const router = express.Router();

// Get sales analytics
router.get('/sales', authenticateToken, isShop, async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const intervalDays = period === 'week' ? 7 : period === 'year' ? 365 : 30;

        // Current period
        const totalSales = await pool.query(
            `SELECT
                COUNT(*) as request_count,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(DISTINCT contractor_id) as unique_customers,
                COALESCE(AVG(total_amount), 0) as avg_request_value
             FROM requests
             WHERE shop_id = $1 AND status != 'cancelled'
               AND request_date >= NOW() - ($2 || ' days')::INTERVAL`,
            [req.user.id, intervalDays]
        );

        // Previous period (for trend %)
        const prevSales = await pool.query(
            `SELECT
                COUNT(*) as request_count,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(DISTINCT contractor_id) as unique_customers,
                COALESCE(AVG(total_amount), 0) as avg_request_value
             FROM requests
             WHERE shop_id = $1 AND status != 'cancelled'
               AND request_date >= NOW() - ($2 || ' days')::INTERVAL * 2
               AND request_date <  NOW() - ($2 || ' days')::INTERVAL`,
            [req.user.id, intervalDays]
        );

        const calcTrend = (curr, prev) => {
            const c = parseFloat(curr), p = parseFloat(prev);
            if (p === 0) return c > 0 ? 100 : 0;
            return parseFloat(((c - p) / p * 100).toFixed(1));
        };
        const cur = totalSales.rows[0], prv = prevSales.rows[0];
        const trends = {
            revenue: calcTrend(cur.total_revenue, prv.total_revenue),
            requests:  calcTrend(cur.request_count,   prv.request_count),
            customers: calcTrend(cur.unique_customers, prv.unique_customers),
            avg_request: calcTrend(cur.avg_request_value,  prv.avg_request_value),
        };

        const recentRequests = await pool.query(
            `SELECT id, request_date, total_amount, status, contractor_id
             FROM requests
             WHERE shop_id = $1 AND request_date >= NOW() - ($2 || ' days')::INTERVAL
             ORDER BY request_date ASC`,
            [req.user.id, intervalDays]
        );

        const topProducts = await pool.query(
            `SELECT p.name, SUM(ri.quantity) as quantity_sold,
                    COUNT(DISTINCT r.id) as request_count,
                    COALESCE(SUM(ri.subtotal), 0) as total_revenue
             FROM request_items ri
             JOIN products p ON ri.product_id = p.id
             JOIN requests r ON ri.request_id = r.id
             WHERE r.shop_id = $1 AND r.request_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY p.id, p.name
             ORDER BY total_revenue DESC
             LIMIT 6`,
            [req.user.id, intervalDays]
        );

        const categoryBreakdown = await pool.query(
            `SELECT p.category, COUNT(DISTINCT r.id) as request_count
             FROM request_items ri
             JOIN products p ON ri.product_id = p.id
             JOIN requests r ON ri.request_id = r.id
             WHERE r.shop_id = $1 AND r.request_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY p.category
             ORDER BY request_count DESC`,
            [req.user.id, intervalDays]
        );

        // Request status breakdown
        const statusBreakdown = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM requests
             WHERE shop_id = $1 AND request_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY status`,
            [req.user.id, intervalDays]
        );

        // Top customers by spend
        const topCustomers = await pool.query(
            `SELECT u.company_name, u.email,
                    COUNT(r.id) as request_count,
                    COALESCE(SUM(r.total_amount), 0) as total_spent,
                    MAX(r.request_date) as last_request_date
             FROM requests r
             JOIN users u ON r.contractor_id = u.id
             WHERE r.shop_id = $1 AND r.status != 'cancelled'
               AND r.request_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY u.id, u.company_name, u.email
             ORDER BY total_spent DESC
             LIMIT 8`,
            [req.user.id, intervalDays]
        );

        // New vs returning customers
        const customerRetention = await pool.query(
            `SELECT
                COUNT(DISTINCT CASE WHEN first_request >= NOW() - ($2 || ' days')::INTERVAL THEN contractor_id END) as new_customers,
                COUNT(DISTINCT CASE WHEN first_request <  NOW() - ($2 || ' days')::INTERVAL THEN contractor_id END) as returning_customers
             FROM (
                SELECT contractor_id, MIN(request_date) as first_request
                FROM requests WHERE shop_id = $1 GROUP BY contractor_id
             ) sub
             WHERE contractor_id IN (
                SELECT DISTINCT contractor_id FROM requests
                WHERE shop_id = $1 AND request_date >= NOW() - ($2 || ' days')::INTERVAL
             )`,
            [req.user.id, intervalDays]
        );

        // Peak requesting hours
        const peakHours = await pool.query(
            `SELECT EXTRACT(HOUR FROM request_date)::int as hour, COUNT(*) as request_count
             FROM requests
             WHERE shop_id = $1 AND request_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY hour ORDER BY hour ASC`,
            [req.user.id, intervalDays]
        );

        // Revenue heatmap by day of week
        const revenueByDow = await pool.query(
            `SELECT TO_CHAR(request_date, 'Dy') as day,
                    EXTRACT(DOW FROM request_date)::int as dow,
                    COUNT(*) as request_count,
                    COALESCE(SUM(total_amount), 0) as revenue
             FROM requests
             WHERE shop_id = $1 AND status != 'cancelled'
               AND request_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY day, dow ORDER BY dow ASC`,
            [req.user.id, intervalDays]
        );

        // Average fulfillment time (pending → delivered)
        const fulfillmentTime = await pool.query(
            `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - request_date))/3600)::numeric, 1) as avg_hours
             FROM requests
             WHERE shop_id = $1 AND delivered_at IS NOT NULL
               AND request_date >= NOW() - ($2 || ' days')::INTERVAL`,
            [req.user.id, intervalDays]
        );

        // Dead stock — products with zero requests in period
        const deadStock = await pool.query(
            `SELECT p.id, p.name, p.category, p.stock_quantity, p.unit_price
             FROM products p
             WHERE p.shop_id = $1
               AND p.stock_quantity > 0
               AND p.id NOT IN (
                   SELECT DISTINCT ri.product_id
                   FROM request_items ri
                   JOIN requests r ON ri.request_id = r.id
                   WHERE r.shop_id = $1
                     AND r.request_date >= NOW() - ($2 || ' days')::INTERVAL
               )
             ORDER BY p.stock_quantity DESC
             LIMIT 8`,
            [req.user.id, intervalDays]
        );

        // Low stock top sellers — products low in stock but actively selling
        const lowStockTopSellers = await pool.query(
            `SELECT p.id, p.name, p.category, p.stock_quantity,
                    COALESCE(SUM(ri.quantity), 0) as qty_sold
             FROM products p
             JOIN request_items ri ON ri.product_id = p.id
             JOIN requests r ON ri.request_id = r.id
             WHERE p.shop_id = $1 AND p.stock_quantity < 10
               AND r.request_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY p.id, p.name, p.category, p.stock_quantity
             ORDER BY qty_sold DESC
             LIMIT 6`,
            [req.user.id, intervalDays]
        );

        // Cancellation rate per product
        const cancellationRate = await pool.query(
            `SELECT p.name,
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as cancelled_requests,
                    ROUND(COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) * 100.0 / NULLIF(COUNT(*),0), 1) as cancel_rate
             FROM request_items ri
             JOIN products p ON ri.product_id = p.id
             JOIN requests r ON ri.request_id = r.id
             WHERE r.shop_id = $1 AND r.request_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY p.id, p.name
             HAVING COUNT(*) > 0
             ORDER BY cancel_rate DESC
             LIMIT 6`,
            [req.user.id, intervalDays]
        );

        res.json({
            total: { ...cur, trends },
            recentRequests: recentRequests.rows,
            topProducts: topProducts.rows,
            categoryBreakdown: categoryBreakdown.rows,
            statusBreakdown: statusBreakdown.rows,
            topCustomers: topCustomers.rows,
            customerRetention: customerRetention.rows[0],
            peakHours: peakHours.rows,
            revenueByDow: revenueByDow.rows,
            avgFulfillmentHours: fulfillmentTime.rows[0]?.avg_hours || null,
            deadStock: deadStock.rows,
            lowStockTopSellers: lowStockTopSellers.rows,
            cancellationRate: cancellationRate.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Contractor spending analytics
router.get('/spending', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type !== 'contractor')
            return res.status(403).json({ error: 'Contractor only' });

        const { period = 'month' } = req.query;
        const intervalDays = period === 'week' ? 7 : period === 'year' ? 365 : 30;

        const totals = await pool.query(
            `SELECT
                COUNT(*) as order_count,
                COALESCE(SUM(total_amount), 0) as total_spent,
                COALESCE(AVG(total_amount), 0) as avg_order_value,
                COUNT(DISTINCT shop_id) as unique_shops
             FROM orders
             WHERE contractor_id = $1 AND order_date >= NOW() - ($2 || ' days')::INTERVAL`,
            [req.user.id, intervalDays]
        );

        const spendingOverTime = await pool.query(
            `SELECT DATE_TRUNC('day', order_date) as date,
                    COUNT(*) as orders,
                    SUM(total_amount) as spent
             FROM orders
             WHERE contractor_id = $1 AND order_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY DATE_TRUNC('day', order_date)
             ORDER BY date ASC`,
            [req.user.id, intervalDays]
        );

        const topShops = await pool.query(
            `SELECT u.company_name, COUNT(o.id) as orders, SUM(o.total_amount) as total_spent
             FROM orders o JOIN users u ON o.shop_id = u.id
             WHERE o.contractor_id = $1 AND o.order_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY u.id, u.company_name
             ORDER BY total_spent DESC LIMIT 5`,
            [req.user.id, intervalDays]
        );

        const topProducts = await pool.query(
            `SELECT p.name, p.category, SUM(oi.quantity) as qty, SUM(oi.subtotal) as total_spent
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             JOIN orders o ON oi.order_id = o.id
             WHERE o.contractor_id = $1 AND o.order_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY p.id, p.name, p.category
             ORDER BY total_spent DESC LIMIT 6`,
            [req.user.id, intervalDays]
        );

        const statusBreakdown = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM orders
             WHERE contractor_id = $1 AND order_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY status`,
            [req.user.id, intervalDays]
        );

        res.json({
            total: {
                ...totals.rows[0],
                formatted_total_spent: CURRENCY.format(totals.rows[0].total_spent),
                formatted_avg: CURRENCY.format(totals.rows[0].avg_order_value),
            },
            spendingOverTime: spendingOverTime.rows,
            topShops: topShops.rows,
            topProducts: topProducts.rows,
            statusBreakdown: statusBreakdown.rows,
        });
    } catch (error) {
        console.error('Contractor analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch spending analytics' });
    }
});

// Export analytics as CSV
router.get('/sales/export', authenticateToken, isShop, async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const intervalDays = period === 'week' ? 7 : period === 'year' ? 365 : 30;

        const [orders, products, customers] = await Promise.all([
            pool.query(
                `SELECT o.id, o.order_date, o.total_amount, o.status, u.company_name as customer
                 FROM orders o JOIN users u ON o.contractor_id = u.id
                 WHERE o.shop_id = $1 AND o.order_date >= NOW() - ($2 || ' days')::INTERVAL
                 ORDER BY o.order_date DESC`,
                [req.user.id, intervalDays]
            ),
            pool.query(
                `SELECT p.name, SUM(oi.quantity) as qty_sold, COALESCE(SUM(oi.subtotal),0) as revenue
                 FROM order_items oi
                 JOIN products p ON oi.product_id = p.id
                 JOIN orders o ON oi.order_id = o.id
                 WHERE o.shop_id = $1 AND o.order_date >= NOW() - ($2 || ' days')::INTERVAL
                 GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 20`,
                [req.user.id, intervalDays]
            ),
            pool.query(
                `SELECT u.company_name, COUNT(o.id) as orders, COALESCE(SUM(o.total_amount),0) as total_spent
                 FROM orders o JOIN users u ON o.contractor_id = u.id
                 WHERE o.shop_id = $1 AND o.status != 'cancelled'
                   AND o.order_date >= NOW() - ($2 || ' days')::INTERVAL
                 GROUP BY u.id, u.company_name ORDER BY total_spent DESC LIMIT 10`,
                [req.user.id, intervalDays]
            ),
        ]);

        const toCSV = (rows, headers) => [
            headers.join(','),
            ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))
        ].join('\n');

        const ordersCSV  = toCSV(orders.rows,    ['id','order_date','customer','total_amount','status']);
        const productsCSV = toCSV(products.rows,  ['name','qty_sold','revenue']);
        const customersCSV = toCSV(customers.rows, ['company_name','orders','total_spent']);

        const combined = `ORDERS\n${ordersCSV}\n\nTOP PRODUCTS\n${productsCSV}\n\nTOP CUSTOMERS\n${customersCSV}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${period}-${Date.now()}.csv"`);
        res.send(combined);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to export analytics' });
    }
});

// Send scheduled email report
router.post('/sales/report', authenticateToken, isShop, async (req, res) => {
    try {
        const { period = 'month' } = req.body;
        const intervalDays = period === 'week' ? 7 : period === 'year' ? 365 : 30;

        const shopResult = await pool.query('SELECT email, company_name FROM users WHERE id = $1', [req.user.id]);
        const shop = shopResult.rows[0];

        const totals = await pool.query(
            `SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as total_revenue,
                    COUNT(DISTINCT contractor_id) as unique_customers,
                    COALESCE(AVG(total_amount),0) as avg_order_value
             FROM orders WHERE shop_id = $1 AND status != 'cancelled'
               AND order_date >= NOW() - ($2 || ' days')::INTERVAL`,
            [req.user.id, intervalDays]
        );
        const t = totals.rows[0];

        const topProducts = await pool.query(
            `SELECT p.name, COALESCE(SUM(oi.subtotal),0) as revenue
             FROM order_items oi JOIN products p ON oi.product_id = p.id
             JOIN orders o ON oi.order_id = o.id
             WHERE o.shop_id = $1 AND o.order_date >= NOW() - ($2 || ' days')::INTERVAL
             GROUP BY p.name ORDER BY revenue DESC LIMIT 5`,
            [req.user.id, intervalDays]
        );

        const { sendEmail } = require('../utils/email');
        const periodLabel = period === 'week' ? 'Last 7 Days' : period === 'year' ? 'Last Year' : 'Last 30 Days';
        const productRows = topProducts.rows.map(p =>
            `<tr><td style="padding:6px 12px">${p.name}</td><td style="padding:6px 12px;text-align:right">K ${parseFloat(p.revenue).toFixed(2)}</td></tr>`
        ).join('');

        await sendEmail(shop.email, `Sales Report (${periodLabel}) — HardwareB2B`, `
            <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111">
                <h2 style="color:#1d4ed8">Sales Report — ${periodLabel}</h2>
                <p>Hi <strong>${shop.company_name}</strong>, here is your analytics summary.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0">
                    <tr style="background:#f1f5f9"><td style="padding:8px 12px">Total Revenue</td><td style="padding:8px 12px;text-align:right"><strong>K ${parseFloat(t.total_revenue).toFixed(2)}</strong></td></tr>
                    <tr><td style="padding:8px 12px">Total Orders</td><td style="padding:8px 12px;text-align:right">${t.order_count}</td></tr>
                    <tr style="background:#f1f5f9"><td style="padding:8px 12px">Unique Customers</td><td style="padding:8px 12px;text-align:right">${t.unique_customers}</td></tr>
                    <tr><td style="padding:8px 12px">Avg Order Value</td><td style="padding:8px 12px;text-align:right">K ${parseFloat(t.avg_order_value).toFixed(2)}</td></tr>
                </table>
                <h3 style="color:#374151">Top Products</h3>
                <table style="width:100%;border-collapse:collapse">${productRows}</table>
                <p style="color:#6b7280;font-size:12px;margin-top:24px">HardwareB2B PNG Analytics</p>
            </div>
        `);

        res.json({ message: `Report sent to ${shop.email}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send report' });
    }
});

module.exports = router;