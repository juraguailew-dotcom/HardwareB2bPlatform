// backend/socket/chat.js
const getPool = () => require('../database/db');

let io;

const initializeSocket = (server) => {
    io = require('socket.io')(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    const onlineUsers = new Map();

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // ── User presence ──────────────────────────────────────────────
        socket.on('user-connect', (userId) => {
            onlineUsers.set(String(userId), socket.id);
            socket.join(`user-${userId}`);
        });

        // ── Order-scoped chat (existing) ───────────────────────────────
        socket.on('join-order-chat', async ({ orderId, userId }) => {
            socket.join(`order-${orderId}`);
            await getPool().query(
                'UPDATE chat_messages SET is_read = true WHERE order_id = $1 AND receiver_id = $2',
                [orderId, userId]
            );
            const messages = await getPool().query(
                `SELECT cm.*, u.company_name as sender_name
                 FROM chat_messages cm
                 JOIN users u ON cm.sender_id = u.id
                 WHERE cm.order_id = $1
                 ORDER BY cm.created_at ASC`,
                [orderId]
            );
            socket.emit('chat-history', messages.rows);
        });

        socket.on('send-message', async (data) => {
            const { orderId, senderId, receiverId, message } = data;
            try {
                const result = await getPool().query(
                    `INSERT INTO chat_messages (order_id, sender_id, receiver_id, message)
                     VALUES ($1, $2, $3, $4) RETURNING *`,
                    [orderId, senderId, receiverId, message]
                );
                const newMessage = result.rows[0];
                const userResult = await getPool().query(
                    'SELECT company_name FROM users WHERE id = $1', [senderId]
                );
                const messageWithSender = { ...newMessage, sender_name: userResult.rows[0].company_name };
                io.to(`order-${orderId}`).emit('new-message', messageWithSender);
                if (onlineUsers.has(String(receiverId))) {
                    io.to(`user-${receiverId}`).emit('new-notification', {
                        type: 'message', orderId,
                        message: `New message about order #${orderId}`
                    });
                }
            } catch (error) {
                console.error('Error saving order message:', error);
            }
        });

        socket.on('typing', ({ orderId, userId, isTyping }) => {
            socket.to(`order-${orderId}`).emit('user-typing', { userId, isTyping });
        });

        // ── Direct messaging (contractor <-> shop) ─────────────────────
        socket.on('join-direct-chat', async ({ userId, partnerId }) => {
            const roomId = directRoomId(userId, partnerId);
            socket.join(roomId);

            // Mark incoming messages as read
            await getPool().query(
                'UPDATE direct_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2',
                [partnerId, userId]
            );

            const messages = await getPool().query(
                `SELECT dm.*, u.company_name as sender_name
                 FROM direct_messages dm
                 JOIN users u ON dm.sender_id = u.id
                 WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
                    OR (dm.sender_id = $2 AND dm.receiver_id = $1)
                 ORDER BY dm.created_at ASC`,
                [userId, partnerId]
            );
            socket.emit('direct-history', messages.rows);
        });

        socket.on('send-direct-message', async ({ senderId, receiverId, message, attachmentUrl, attachmentName, attachmentType }) => {
            try {
                const result = await getPool().query(
                    `INSERT INTO direct_messages (sender_id, receiver_id, message, attachment_url, attachment_name, attachment_type)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [senderId, receiverId, message || '', attachmentUrl || null, attachmentName || null, attachmentType || null]
                );
                const row = result.rows[0];
                const userResult = await getPool().query(
                    'SELECT company_name FROM users WHERE id = $1', [senderId]
                );
                const msg = { ...row, sender_name: userResult.rows[0].company_name };

                const roomId = directRoomId(senderId, receiverId);
                io.to(roomId).emit('direct-message', msg);

                // Push notification to receiver if online but not in room
                if (onlineUsers.has(String(receiverId))) {
                    io.to(`user-${receiverId}`).emit('new-notification', {
                        type: 'direct_message',
                        senderId,
                        message: `New message from ${userResult.rows[0].company_name}`
                    });
                }
            } catch (error) {
                console.error('Error saving direct message:', error);
            }
        });

        socket.on('direct-typing', ({ senderId, receiverId, isTyping }) => {
            const roomId = directRoomId(senderId, receiverId);
            socket.to(roomId).emit('direct-typing', { senderId, isTyping });
        });

        // ── Disconnect ─────────────────────────────────────────────────
        socket.on('disconnect', () => {
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) { onlineUsers.delete(userId); break; }
            }
        });
    });

    return io;
};

// Stable room ID regardless of who initiates
const directRoomId = (a, b) =>
    `direct-${Math.min(Number(a), Number(b))}-${Math.max(Number(a), Number(b))}`;

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

module.exports = { initializeSocket, getIO };
