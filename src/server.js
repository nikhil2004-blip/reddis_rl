const dotenv = require('dotenv');
dotenv.config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve frontend files

// Explicitly serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Rate Limiter (Applied to all routes for demonstration, or specific ones)
// We will apply it specifically to the "Spam API" route in the frontend demo, 
// but let's also add a general one or just use the middleware where needed.
// For this demo, let's expose a specific route to test rate limiting.

app.use('/api/auth', authRoutes);

app.get('/api/public', (req, res) => {
    res.json({ message: 'This is a public endpoint. No auth required.' });
});

// Endpoint specifically to test Rate Limiting
app.get('/api/spam', rateLimiter, (req, res) => {
    res.json({ message: 'You successfully hit the spam endpoint! Redis allowed this.' });
});

// Export app for Vercel/Serverless
module.exports = app;

// Only listen if run directly (not imported)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
