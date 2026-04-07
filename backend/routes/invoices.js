// backend/routes/invoices.js
const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const router = express.Router();

// ── Platform / issuer details ─────────────────────────────────────────────────
const PLATFORM = {
    name:    'HardwareB2B Platform',
    tagline: 'Papua New Guinea Hardware Supply Network',
    address: 'Port Moresby, National Capital District, Papua New Guinea',
    email:   'support@hardwareb2b.com.pg',
    phone:   '+675 000 0000',
    website: 'www.hardwareb2b.com.pg',
    taxId:   'TIN-PG-000000',
    currency:'K (PGK)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `K ${parseFloat(n || 0).toFixed(2)}`;
const LINE_COLOR  = '#E0E0E0';
const PRIMARY     = '#1565C0';
const TEXT_DARK   = '#1A1A2E';
const TEXT_MUTED  = '#6B7280';

function drawHRule(doc, y, color = LINE_COLOR) {
    doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(0.5).stroke();
}

function labelValue(doc, label, value, x, y, labelColor = TEXT_MUTED) {
    doc.fontSize(8).fillColor(labelColor).text(label.toUpperCase(), x, y, { width: 220 });
    doc.fontSize(10).fillColor(TEXT_DARK).text(value || '—', x, y + 12, { width: 220 });
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.get('/order/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        const orderResult = await pool.query(
            `SELECT o.*,
                    u_s.company_name as shop_name,    u_s.address as shop_address,
                    u_s.phone        as shop_phone,   u_s.email   as shop_email,
                    u_s.tax_id       as shop_tax_id,
                    u_c.company_name as contractor_name, u_c.address as contractor_address,
                    u_c.phone        as contractor_phone, u_c.email  as contractor_email,
                    u_c.tax_id       as contractor_tax_id
             FROM orders o
             JOIN users u_s ON o.shop_id       = u_s.id
             JOIN users u_c ON o.contractor_id = u_c.id
             WHERE o.id = $1`,
            [orderId]
        );

        if (orderResult.rows.length === 0)
            return res.status(404).json({ error: 'Order not found' });

        const order = orderResult.rows[0];

        // Only the contractor who placed the order or the shop fulfilling it may download
        if (req.user.id !== order.contractor_id && req.user.id !== order.shop_id && req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const itemsResult = await pool.query(
            `SELECT oi.*, p.name, p.unit_type
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $1`,
            [orderId]
        );
        const items = itemsResult.rows;

        // ── Build PDF ─────────────────────────────────────────────────────────
        const PAGE_HEIGHT = 841;
        const FOOTER_H    = 62;
        const MARGIN_BOT  = 20;
        const CONTENT_MAX = PAGE_HEIGHT - FOOTER_H - MARGIN_BOT; // ~759

        const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });

        // Ensure y never overflows — add a new page and reset y if needed
        const ensureSpace = (neededHeight) => {
            if (y + neededHeight > CONTENT_MAX) {
                doc.addPage();
                y = 50;
            }
        };

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
        doc.pipe(res);

        // ── 1. Header banner ──────────────────────────────────────────────────
        doc.rect(0, 0, 595, 110).fill(PRIMARY);

        doc.fontSize(22).fillColor('white').font('Helvetica-Bold')
            .text(PLATFORM.name, 50, 28);
        doc.fontSize(9).fillColor('rgba(255,255,255,0.8)').font('Helvetica')
            .text(PLATFORM.tagline, 50, 54);
        doc.fontSize(8).fillColor('rgba(255,255,255,0.7)')
            .text(`${PLATFORM.address}`, 50, 68)
            .text(`${PLATFORM.email}  |  ${PLATFORM.phone}  |  ${PLATFORM.website}`, 50, 80)
            .text(`TIN: ${PLATFORM.taxId}`, 50, 92);

        // INVOICE label top-right
        doc.fontSize(28).fillColor('white').font('Helvetica-Bold')
            .text('INVOICE', 370, 30, { width: 175, align: 'right' });
        doc.fontSize(9).fillColor('rgba(255,255,255,0.8)').font('Helvetica')
            .text(`#INV-${String(orderId).padStart(5, '0')}`, 370, 64, { width: 175, align: 'right' });

        // ── 2. Invoice meta row ───────────────────────────────────────────────
        let y = 125;
        doc.fontSize(9).fillColor(TEXT_MUTED).font('Helvetica');

        const metaItems = [
            { label: 'Invoice No.',   value: `INV-${String(orderId).padStart(5, '0')}` },
            { label: 'Order No.',     value: `#${orderId}` },
            { label: 'Issue Date',    value: new Date(order.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
            { label: 'Status',        value: order.status.toUpperCase() },
            { label: 'Currency',      value: PLATFORM.currency },
        ];

        const colW = 99;
        metaItems.forEach((m, i) => {
            const x = 50 + i * colW;
            doc.fontSize(7).fillColor(TEXT_MUTED).font('Helvetica')
                .text(m.label.toUpperCase(), x, y, { width: colW - 4 });
            doc.fontSize(9).fillColor(TEXT_DARK).font('Helvetica-Bold')
                .text(m.value, x, y + 11, { width: colW - 4 });
        });

        y += 38;
        drawHRule(doc, y);

        // ── 3. Seller / Buyer ─────────────────────────────────────────────────
        y += 14;
        doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold')
            .text('SOLD BY', 50, y).text('BILLED TO', 300, y);

        y += 16;
        // Seller (shop)
        doc.fontSize(11).fillColor(TEXT_DARK).font('Helvetica-Bold')
            .text(order.shop_name || '—', 50, y, { width: 220 });
        doc.fontSize(9).fillColor(TEXT_MUTED).font('Helvetica');
        let sellerY = y + 16;
        if (order.shop_address) { doc.text(order.shop_address, 50, sellerY, { width: 220 }); sellerY += 24; }
        if (order.shop_phone)   { doc.text(`Phone: ${order.shop_phone}`, 50, sellerY, { width: 220 }); sellerY += 13; }
        if (order.shop_email)   { doc.text(`Email: ${order.shop_email}`, 50, sellerY, { width: 220 }); sellerY += 13; }
        if (order.shop_tax_id)  { doc.text(`TIN: ${order.shop_tax_id}`, 50, sellerY, { width: 220 }); sellerY += 13; }

        // Buyer (contractor)
        doc.fontSize(11).fillColor(TEXT_DARK).font('Helvetica-Bold')
            .text(order.contractor_name || '—', 300, y, { width: 245 });
        doc.fontSize(9).fillColor(TEXT_MUTED).font('Helvetica');
        let buyerY = y + 16;
        if (order.contractor_address) { doc.text(order.contractor_address, 300, buyerY, { width: 245 }); buyerY += 24; }
        if (order.delivery_address)   { doc.text(`Delivery: ${order.delivery_address}`, 300, buyerY, { width: 245 }); buyerY += 13; }
        if (order.contractor_phone)   { doc.text(`Phone: ${order.contractor_phone}`, 300, buyerY, { width: 245 }); buyerY += 13; }
        if (order.contractor_email)   { doc.text(`Email: ${order.contractor_email}`, 300, buyerY, { width: 245 }); buyerY += 13; }
        if (order.contractor_tax_id)  { doc.text(`TIN: ${order.contractor_tax_id}`, 300, buyerY, { width: 245 }); buyerY += 13; }

        y = Math.max(sellerY, buyerY) + 14;
        drawHRule(doc, y);

        // ── 4. Items table ────────────────────────────────────────────────────
        y += 14;
        doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold').text('ORDER ITEMS', 50, y);
        y += 16;

        // Table header bg
        doc.rect(50, y, 495, 20).fill('#EFF6FF');
        doc.fontSize(8).fillColor(PRIMARY).font('Helvetica-Bold');
        doc.text('#',           55,  y + 6, { width: 20 });
        doc.text('PRODUCT',     80,  y + 6, { width: 200 });
        doc.text('UNIT TYPE',   285, y + 6, { width: 70 });
        doc.text('QTY',         360, y + 6, { width: 40, align: 'right' });
        doc.text('UNIT PRICE',  405, y + 6, { width: 65, align: 'right' });
        doc.text('SUBTOTAL',    475, y + 6, { width: 65, align: 'right' });
        y += 22;

        items.forEach((item, i) => {
            ensureSpace(20);
            if (i % 2 === 0) doc.rect(50, y - 2, 495, 18).fill('#FAFAFA');
            doc.fontSize(9).fillColor(TEXT_DARK).font('Helvetica');
            doc.text(String(i + 1),          55,  y, { width: 20 });
            doc.text(item.name,              80,  y, { width: 200 });
            doc.text(item.unit_type || '—',  285, y, { width: 70 });
            doc.text(String(item.quantity),  360, y, { width: 40, align: 'right' });
            doc.text(fmt(item.unit_price),   405, y, { width: 65, align: 'right' });
            doc.font('Helvetica-Bold')
               .text(fmt(item.subtotal),     475, y, { width: 65, align: 'right' });
            y += 20;
        });

        ensureSpace(22);
        drawHRule(doc, y + 4);
        y += 18;

        // ── 5. Totals ─────────────────────────────────────────────────────────
        const subtotal = items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);
        const gst      = subtotal * 0.10;
        const total    = subtotal + gst;

        ensureSpace(80);
        const totalsX = 360;
        doc.fontSize(9).fillColor(TEXT_MUTED).font('Helvetica');
        doc.text('Subtotal:',  totalsX, y, { width: 110, align: 'right' });
        doc.fillColor(TEXT_DARK).text(fmt(subtotal), totalsX + 115, y, { width: 65, align: 'right' });
        y += 16;
        doc.fillColor(TEXT_MUTED).text('GST (10%):',  totalsX, y, { width: 110, align: 'right' });
        doc.fillColor(TEXT_DARK).text(fmt(gst), totalsX + 115, y, { width: 65, align: 'right' });
        y += 10;
        drawHRule(doc, y, PRIMARY);
        y += 8;

        doc.rect(totalsX - 5, y - 4, 195, 24).fill(PRIMARY);
        doc.fontSize(11).fillColor('white').font('Helvetica-Bold');
        doc.text('TOTAL DUE:', totalsX, y + 2, { width: 110, align: 'right' });
        doc.text(fmt(total),   totalsX + 115, y + 2, { width: 65, align: 'right' });
        y += 32;

        // ── 6. Notes ──────────────────────────────────────────────────────────
        if (order.notes) {
            ensureSpace(50);
            drawHRule(doc, y);
            y += 12;
            doc.fontSize(9).fillColor(TEXT_MUTED).font('Helvetica-Bold').text('NOTES', 50, y);
            y += 13;
            doc.fontSize(9).fillColor(TEXT_DARK).font('Helvetica').text(order.notes, 50, y, { width: 495 });
            y += 24;
        }

        // ── 7. Payment terms ──────────────────────────────────────────────────
        ensureSpace(55);
        drawHRule(doc, y);
        y += 12;
        doc.fontSize(9).fillColor(TEXT_MUTED).font('Helvetica-Bold').text('PAYMENT TERMS', 50, y);
        y += 13;
        doc.fontSize(9).fillColor(TEXT_DARK).font('Helvetica')
            .text('Payment is due within 30 days of invoice date. Please reference the invoice number in all payments.', 50, y, { width: 495 });
        y += 28;

        // ── 8. Footer — drawn immediately after last content ──────────────────
        const footerY = y + 10;
        doc.rect(0, footerY, 595, FOOTER_H).fill('#F3F4F6');
        doc.fontSize(8).fillColor(TEXT_MUTED).font('Helvetica')
            .text(`This invoice was generated by ${PLATFORM.name} — ${PLATFORM.website}`, 50, footerY + 10, { width: 495, align: 'center' })
            .text(`For queries contact: ${PLATFORM.email}  |  ${PLATFORM.phone}`, 50, footerY + 23, { width: 495, align: 'center' })
            .text(`© ${new Date().getFullYear()} ${PLATFORM.name}. All rights reserved.`, 50, footerY + 36, { width: 495, align: 'center' });

        doc.end();

    } catch (error) {
        console.error('Invoice generation error:', error);
        res.status(500).json({ error: 'Failed to generate invoice' });
    }
});

module.exports = router;
