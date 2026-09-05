const mongoose = require('mongoose');
const dns = require('dns');

// Force Node to use Google/Cloudflare DNS instead of the system default,
// which fixes SRV lookup failures on some Windows networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;