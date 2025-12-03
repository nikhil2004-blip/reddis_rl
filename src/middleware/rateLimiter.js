const { Redis } = require('@upstash/redis');

// Initialize Redis
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RATE_LIMIT = 5; // Max requests
const WINDOW_DURATION = 10; // In seconds

const rateLimiter = async (req, res, next) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const key = `ratelimit:${ip}`;

        // Atomic increment
        const requests = await redis.incr(key);

        let ttl;
        if (requests === 1) {
            await redis.expire(key, WINDOW_DURATION);
            ttl = WINDOW_DURATION;
        } else {
            ttl = await redis.ttl(key);
        }

        // Set Headers
        res.set('X-RateLimit-Limit', RATE_LIMIT);
        res.set('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - requests));
        res.set('X-RateLimit-Reset', ttl);

        // Check limit
        if (requests > RATE_LIMIT) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
                limit: RATE_LIMIT,
                current: requests
            });
        }

        // Attach info to request for debugging/headers if needed
        req.rateLimit = { limit: RATE_LIMIT, current: requests, ttl };
        next();
    } catch (error) {
        console.error('Redis Rate Limiter Error:', error);
        // Fail open or closed? Usually fail open (allow request) if cache is down, 
        // but for this demo we want to see errors.
        next();
    }
};

module.exports = rateLimiter;
