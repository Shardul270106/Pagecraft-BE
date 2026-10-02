require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const app = express();

// ---- Middleware ----
// Vite may move from 5173 to 5174 when the default port is busy. Allow
// localhost dev origins on any port outside production; production remains
// restricted to the explicitly configured CLIENT_URL origin(s).
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
      && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '12mb' }));

// ---- Connect to MongoDB ----
connectDB();

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database is temporarily unavailable. The server is retrying its connection.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }
  next();
};

// ---- Routes ----
app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/portfolios', requireDatabase, require('./routes/portfolioRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));

app.get('/', (req, res) => {
  res.send('Pagecraft API is running');
});

app.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    api: 'ok',
    database: databaseConnected ? 'connected' : 'reconnecting',
  });
});

// ---- Error handler (fallback) ----
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
