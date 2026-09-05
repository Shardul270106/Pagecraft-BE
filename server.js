require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ---- Middleware ----
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

// ---- Connect to MongoDB ----
connectDB();

// ---- Routes ----
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Pagecraft API is running');
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