const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  image: { type: String, default: '' },
}, { _id: false, strict: false });

const portfolioSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  templateId: { type: String, default: 'professional-portfolio' },
  sections: { type: [sectionSchema], default: [] },
  templateContent: { type: [String], default: [] },
  templateImages: { type: [String], default: [] },
  theme: {
    accent: { type: String, default: '#e6e51e' },
    background: { type: String, default: '#ffffff' },
    font: { type: String, default: 'Inter' },
    layout: { type: String, default: 'modern' },
  },
  slug: { type: String, unique: true, sparse: true, index: true },
  published: { type: Boolean, default: false },
  visits: { type: Number, default: 0 },
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('Portfolio', portfolioSchema);
