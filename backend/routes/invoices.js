// backend/routes/invoices.js
const express = require('express');
const pool    = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const router = express.Router();

const PLATFORM = {
    name:    'Digital Material Requisition System',
    tagline: 'Papua New Guinea Hardware Supply Network',
    address: 'Port Moresby, National Capital District, Papua New Guinea',
};

const fmt   = (n) => `K ${parseFloat(n || 0).toFixed(2)}`;
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const GRAY  = '#F5F5F5';

// ── Draw a labelled field line ────────────────────────────────────────────────
function fieldLine(doc, label, value, x, y, lineWidth = 180) {
    doc.fontSize(9).fillColor(BLACK).font('Helvetica-Bold').text(label, x, y);
    const labelW = doc.widthOfString(label) + 6;
    doc.moveTo(x + labelW, y + 11).lineTo(x + labelW + lineWidth, y + 11)
        .strokeColor(BLACK).lineWidth(0.8).stroke();
    if (value) {
        doc.fontSize(9).fillColor(BLACK).font('Helvetica')
            .text(value, x + labelW + 2, y, { width: lineWidth - 4 });
    }
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.get('/request/:requestId', authenticateToken, async (req, res) => {
    try {
        const { requestId } = req.params;

        const requestResult = await pool.query(
            `SELECT r.*,
                    u_s.company_name as shop_name,       u_s.address as shop_address,
                    u_s.phone        as shop_phone,      u_s.email   as shop_email,
                    u_s.tax_id       as shop_tax_id,
                    u_c.company_name as contractor_name, u_c.address as contractor_address,
                    u_c.phone        as contractor_phone,u_c.email   as contractor_email,
                    u_c.tax_id       as contractor_tax_id
             FROM requests r
             JOIN users u_s ON r.shop_id       = u_s.id
             JOIN users u_c ON r.contractor_id = u_c.id
             WHERE r.id = $1`,
            [requestId]
        );

        if (requestResult.rows.length === 0)
            return res.status(404).json({ error: 'Request not found' });

        const request = requestResult.rows[0];

        if (req.user.id !== request.contractor_id &&
            req.user.id !== request.shop_id &&
            req.user.user_type !== 'admin')
            return res.status(403).json({ error: 'Access denied' });

        const itemsResult = await pool.query(
            `SELECT ri.*,
                    p.name, p.unit_type, p.sku,
                    CASE WHEN ri.unit_price = 0 OR ri.unit_price IS NULL
                         THEN p.unit_price ELSE ri.unit_price END AS unit_price,
                    CASE WHEN ri.subtotal = 0 OR ri.subtotal IS NULL
                         THEN (CASE WHEN ri.unit_price = 0 OR ri.unit_price IS NULL
                                    THEN p.unit_price ELSE ri.unit_price END) * ri.quantity
                         ELSE ri.subtotal END AS subtotal
             FROM request_items ri
             JOIN products p ON ri.product_id = p.id
             WHERE ri.request_id = $1`,
            [requestId]
        );
        const items = itemsResult.rows;

        const subtotal = items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);
        const gst      = subtotal * 0.10;
        const total    = subtotal + gst;

        const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=request-${requestId}.pdf`);
        doc.pipe(res);

        const PW = 595, PH = 841;
        const ML = 36, MR = 36, MT = 30;
        const IW = PW - ML - MR; // inner width = 523

        // ── Outer border ──────────────────────────────────────────────────────
        doc.rect(ML, MT, IW, PH - MT - 30).stroke(BLACK);

        // ── Header section ────────────────────────────────────────────────────
        let y = MT + 12;

        // Platform name (left)
        doc.fontSize(13).fillColor(BLACK).font('Helvetica-Bold')
            .text(PLATFORM.name, ML + 10, y, { width: 200 });
        y += 18;
        doc.fontSize(8).fillColor(BLACK).font('Helvetica')
            .text(PLATFORM.tagline, ML + 10, y, { width: 200 });
        y += 12;
        doc.fontSize(7.5).text(PLATFORM.address, ML + 10, y, { width: 200 });

        // Form title (centre-right)
        doc.fontSize(18).fillColor(BLACK).font('Helvetica-Bold')
            .text('MATERIAL REQUISITION FORM', ML + 200, MT + 14, { width: IW - 210, align: 'center' });
        doc.fontSize(11).font('Helvetica-BoldOblique')
            .text('(IN-STOCK ITEMS ONLY)', ML + 200, MT + 36, { width: IW - 210, align: 'center' });

        y = MT + 72;
        // Horizontal rule under header
        doc.moveTo(ML, y).lineTo(ML + IW, y).strokeColor(BLACK).lineWidth(1).stroke();
        y += 10;

        // ── Info fields row 1 ─────────────────────────────────────────────────
        const dateStr = new Date(request.request_date)
            .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        fieldLine(doc, 'DATE:', dateStr,                    ML + 10, y, 110);
        fieldLine(doc, 'REQUEST #:',  `#${requestId}`,     ML + 175, y, 110);
        fieldLine(doc, 'STATUS:',     request.status.toUpperCase(), ML + 360, y, 120);
        y += 22;

        // ── Info fields row 2 ─────────────────────────────────────────────────
        fieldLine(doc, 'REQUESTED BY:', request.contractor_name || '—', ML + 10, y, 460);
        y += 22;

        // ── Info fields row 3 ─────────────────────────────────────────────────
        fieldLine(doc, 'SUPPLIER:', request.shop_name || '—',          ML + 10, y, 200);
        fieldLine(doc, 'DELIVERY ADDRESS:', request.delivery_address || '—', ML + 280, y, 200);
        y += 22;

        // ── Info fields row 4 ─────────────────────────────────────────────────
        const delivDate = request.delivery_date
            ? new Date(request.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
            : '—';
        fieldLine(doc, 'DELIVERY DATE:', delivDate,                    ML + 10, y, 160);
        fieldLine(doc, 'DELIVERY TIME:', request.delivery_time || '—', ML + 280, y, 200);
        y += 18;

        // ── Section title ─────────────────────────────────────────────────────
        doc.moveTo(ML, y).lineTo(ML + IW, y).strokeColor(BLACK).lineWidth(0.8).stroke();
        y += 8;
        doc.fontSize(11).fillColor(BLACK).font('Helvetica-BoldOblique')
            .text('INVENTORY MATERIAL ITEM(S) NEEDED FOR PROJECT', ML, y, { width: IW, align: 'center' });
        y += 16;

        // ── Table header ──────────────────────────────────────────────────────
        const COL = {
            num:   { x: ML,       w: 30  },
            sku:   { x: ML + 30,  w: 65  },
            qty:   { x: ML + 95,  w: 35  },
            unit:  { x: ML + 130, w: 55  },
            desc:  { x: ML + 185, w: 185 },
            price: { x: ML + 370, w: 70  },
            sub:   { x: ML + 440, w: 83  },
        };
        const ROW_H = 18;
        const TABLE_TOP = y;

        // Header background
        doc.rect(ML, y, IW, ROW_H).fill(BLACK);
        doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold');
        doc.text('#',            COL.num.x  + 4,  y + 5, { width: COL.num.w  - 4 });
        doc.text('STOCK #',      COL.sku.x  + 2,  y + 5, { width: COL.sku.w  - 4 });
        doc.text('QTY.',         COL.qty.x  + 2,  y + 5, { width: COL.qty.w  - 4, align: 'center' });
        doc.text('UNIT OR EACH', COL.unit.x + 2,  y + 5, { width: COL.unit.w - 4, align: 'center' });
        doc.text('ITEM DESCRIPTION', COL.desc.x + 2, y + 5, { width: COL.desc.w - 4 });
        doc.text('UNIT PRICE',   COL.price.x + 2, y + 5, { width: COL.price.w - 4, align: 'right' });
        doc.text('SUBTOTAL',     COL.sub.x  + 2,  y + 5, { width: COL.sub.w  - 6, align: 'right' });
        y += ROW_H;

        // ── Table rows ────────────────────────────────────────────────────────
        const MIN_ROWS = 18;
        const totalRows = Math.max(items.length, MIN_ROWS);

        for (let i = 0; i < totalRows; i++) {
            const item = items[i] || null;
            const rowBg = i % 2 === 0 ? WHITE : GRAY;
            doc.rect(ML, y, IW, ROW_H).fill(rowBg).stroke(BLACK);

            if (item) {
                doc.fontSize(8).fillColor(BLACK).font('Helvetica');
                doc.text(String(i + 1),              COL.num.x  + 4,  y + 5, { width: COL.num.w  - 4 });
                doc.text(item.sku || `P-${item.product_id}`, COL.sku.x + 2, y + 5, { width: COL.sku.w - 4 });
                doc.text(String(item.quantity),      COL.qty.x  + 2,  y + 5, { width: COL.qty.w  - 4, align: 'center' });
                doc.text(item.unit_type || '—',      COL.unit.x + 2,  y + 5, { width: COL.unit.w - 4, align: 'center' });
                doc.text(item.name,                  COL.desc.x + 2,  y + 5, { width: COL.desc.w - 4 });
                doc.text(fmt(item.unit_price),       COL.price.x + 2, y + 5, { width: COL.price.w - 4, align: 'right' });
                doc.font('Helvetica-Bold')
                   .text(fmt(item.subtotal),         COL.sub.x  + 2,  y + 5, { width: COL.sub.w  - 6, align: 'right' });
            } else {
                // Empty row — just draw column dividers
                doc.fontSize(8).fillColor(BLACK).font('Helvetica').text('', COL.num.x + 4, y + 5);
            }

            // Column dividers
            Object.values(COL).forEach(col => {
                doc.moveTo(col.x, y).lineTo(col.x, y + ROW_H).strokeColor(BLACK).lineWidth(0.4).stroke();
            });
            doc.moveTo(ML + IW, y).lineTo(ML + IW, y + ROW_H).strokeColor(BLACK).lineWidth(0.4).stroke();

            y += ROW_H;
        }

        // Bottom border of table
        doc.moveTo(ML, y).lineTo(ML + IW, y).strokeColor(BLACK).lineWidth(1).stroke();
        y += 10;

        // ── Totals section ────────────────────────────────────────────────────
        const totX = ML + 320;
        const totW = IW - 320;

        doc.fontSize(9).fillColor(BLACK).font('Helvetica');
        doc.text('Subtotal:',  totX, y, { width: totW - 80 });
        doc.font('Helvetica-Bold').text(fmt(subtotal), totX + totW - 80, y, { width: 76, align: 'right' });
        y += 14;

        doc.font('Helvetica').text('GST (10%):', totX, y, { width: totW - 80 });
        doc.font('Helvetica-Bold').text(fmt(gst), totX + totW - 80, y, { width: 76, align: 'right' });
        y += 10;

        doc.moveTo(totX, y).lineTo(ML + IW, y).strokeColor(BLACK).lineWidth(0.8).stroke();
        y += 6;

        doc.rect(totX - 4, y - 2, totW + 4, 20).fill(BLACK);
        doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold');
        doc.text('TOTAL DUE:', totX, y + 4, { width: totW - 80 });
        doc.text(fmt(total),   totX + totW - 80, y + 4, { width: 76, align: 'right' });
        y += 28;

        // ── Notes ─────────────────────────────────────────────────────────────
        if (request.notes) {
            doc.moveTo(ML, y).lineTo(ML + IW, y).strokeColor(BLACK).lineWidth(0.5).stroke();
            y += 8;
            doc.fontSize(8.5).fillColor(BLACK).font('Helvetica-Bold').text('NOTES:', ML + 10, y);
            y += 12;
            doc.fontSize(8.5).font('Helvetica').text(request.notes, ML + 10, y, { width: IW - 20 });
            y += 20;
        }

        // ── Signature section ─────────────────────────────────────────────────
        doc.moveTo(ML, y).lineTo(ML + IW, y).strokeColor(BLACK).lineWidth(1).stroke();
        y += 10;

        doc.fontSize(9).fillColor(BLACK).font('Helvetica-Bold')
            .text('AUTHORISED SIGNATURE:', ML + 10, y);
        doc.moveTo(ML + 175, y + 11).lineTo(ML + IW - 10, y + 11)
            .strokeColor(BLACK).lineWidth(0.8).stroke();
        y += 22;

        doc.fontSize(8).fillColor(BLACK).font('Helvetica-Bold')
            .text('(PERSON(S) RECEIVING MATERIAL SHOULD VERIFY ITEMS ARE CORRECT BEFORE LEAVING WAREHOUSE)',
                ML + 10, y, { width: IW - 20, align: 'center' });
        y += 16;

        // ── Footer ────────────────────────────────────────────────────────────
        doc.moveTo(ML, y).lineTo(ML + IW, y).strokeColor(BLACK).lineWidth(0.5).stroke();
        y += 6;
        doc.fontSize(7.5).fillColor(BLACK).font('Helvetica')
            .text(`Generated by ${PLATFORM.name} · ${new Date().toLocaleDateString('en-GB')}`,
                ML + 10, y, { width: IW - 20, align: 'center' });

        doc.end();

    } catch (error) {
        console.error('Request PDF generation error:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to generate request document' });
    }
});

module.exports = router;
