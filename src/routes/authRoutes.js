const express = require('express');
const jwt = require('jsonwebtoken');
const { Redis } = require('@upstash/redis');
const auth = require('../middleware/auth');

const router = express.Router();
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Mock User Database
const USERS = {
    'admin': 'password123',
    'user': '123456'
};

// Login Route
// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Validate Credentials
    if (!USERS[username] || USERS[username] !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Store Session in Redis
    // Key: session:{token}, Value: JSON string of user data
    // Expiry: 15 seconds (DEMO PURPOSE ONLY - normally longer)
    const TTL_SECONDS = 15;
    await redis.set(`session:${token}`, JSON.stringify({ username, loginTime: Date.now() }), { ex: TTL_SECONDS });

    res.json({
        message: 'Login successful',
        token,
        expiresIn: TTL_SECONDS,
        info: 'Token stored in Redis for fast validation'
    });
});

// Protected Route
router.get('/protected', auth, (req, res) => {
    res.json({
        message: 'You have accessed a protected route!',
        user: req.user,
        secretData: 'Redis makes this fast.'
    });
});

// Logout (Revoke Session)
router.post('/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        // Delete from Redis -> Immediate revocation
        await redis.del(`session:${token}`);
    }
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
