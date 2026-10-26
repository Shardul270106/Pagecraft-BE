const mongoose = require('mongoose');

const portfolioVisitorSchema = new mongoose.Schema({
  portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true },
  visitorHash: { type: String, required: true },
  lastViewedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

portfolioVisitorSchema.index({ portfolioId: 1, visitorHash: 1 }, { unique: true });
portfolioVisitorSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PortfolioVisitor', portfolioVisitorSchema);
