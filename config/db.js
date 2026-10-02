const mongoose = require('mongoose');

const RETRY_DELAY_MS = 5000;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function connectDB() {
  while (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('MongoDB connected');
      return mongoose.connection;
    } catch (error) {
      console.error('MongoDB connection unavailable:', error.message);
      console.log(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000} seconds.`);
      await wait(RETRY_DELAY_MS);
    }
  }

  return mongoose.connection;
}

module.exports = connectDB;
