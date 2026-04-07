// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// ── Chat attachment upload (local disk) ────────────────────────────────────
const chatUploadDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) fs.mkdirSync(chatUploadDir, { recursive: true });

const chatStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, chatUploadDir),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `chat-${unique}${path.extname(file.originalname)}`);
    },
});

const ALLOWED_MIME = /image\/(jpeg|jpg|png|webp|gif)|application\/pdf|application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)|text\/plain/;

const chatUpload = multer({
    storage: chatStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        cb(null, ALLOWED_MIME.test(file.mimetype));
    },
});

// POST /api/chat/upload — upload a chat attachment, returns URL + metadata
router.post('/upload', authenticateToken, chatUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded or file type not allowed' });
    const url = `/uploads/chat/${req.file.filename}`;
    const type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
    res.json({ url, name: req.file.originalname, type });
});

// GET /api/chat/conversations — list all conversations for the logged-in user
router.get('/conversations', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const { rows } = await pool.query(
            `SELECT
                u.id              AS partner_id,
                u.company_name    AS partner_name,
                u.user_type       AS partner_type,
                latest.message    AS last_message,
                latest.attachment_type AS last_attachment_type,
                latest.created_at AS last_message_at,
                (
                    SELECT COUNT(*) FROM direct_messages
                    WHERE sender_id = u.id AND receiver_id = $1 AND is_read = false
                )::int AS unread_count
             FROM users u
             JOIN LATERAL (
                 SELECT message, attachment_type, created_at
                 FROM direct_messages
                 WHERE (sender_id = $1 AND receiver_id = u.id)
                    OR (sender_id = u.id AND receiver_id = $1)
                 ORDER BY created_at DESC
                 LIMIT 1
             ) latest ON true
             WHERE u.id != $1
             ORDER BY latest.created_at DESC`,
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('GET /chat/conversations error:', err);
        res.status(500).json({ error: 'Failed to load conversations' });
    }
});

// GET /api/chat/unread — total unread count for badge
router.get('/unread', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT COUNT(*)::int AS count FROM direct_messages WHERE receiver_id = $1 AND is_read = false',
            [req.user.id]
        );
        res.json({ count: rows[0].count });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// GET /api/chat/users — list shops (for contractor) or contractors (for shop) to start a chat
router.get('/users', authenticateToken, async (req, res) => {
    const { user_type } = req.user;
    const targetType = user_type === 'contractor' ? 'shop' : 'contractor';
    try {
        const { rows } = await pool.query(
            'SELECT id, company_name, user_type FROM users WHERE user_type = $1 AND verified = true ORDER BY company_name',
            [targetType]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load users' });
    }
});

module.exports = router;
