const jwt = require('jsonwebtoken');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // 1. Verify JWT signature (Stateless check)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2. Verify Session in Redis (Stateful check for fast revocation/session management)
        // We expect a key like session:{token} to exist.
        const sessionData = await redis.get(`session:${token}`);

        if (!sessionData) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Session expired or revoked' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
};

module.exports = auth;
