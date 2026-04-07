// backend/middleware/rateLimit.js
const requestCounts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;
const AUTH_MAX_REQUESTS = 10; // stricter for auth endpoints

const rateLimit = (max = MAX_REQUESTS) => (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const record = requestCounts.get(key) || { count: 0, resetAt: now + WINDOW_MS };

    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + WINDOW_MS;
    }

    record.count++;
    requestCounts.set(key, record);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));

    if (record.count > max) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    next();
};

const authRateLimit = rateLimit(AUTH_MAX_REQUESTS);
const apiRateLimit = rateLimit(MAX_REQUESTS);

module.exports = { authRateLimit, apiRateLimit };
