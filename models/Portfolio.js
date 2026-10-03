const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  image: { type: String, default: '' },
  contentOffsetX: { type: Number, default: 0 },
  contentOffsetY: { type: Number, default: 0 },
}, { _id: false, strict: false });

const canvasElementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'rectangle', 'circle', 'line', 'icon'], required: true },
  sectionId: { type: String, default: '' },
  iconName: { type: String, default: 'sparkles' },
  x: { type: Number, default: 10 },
  y: { type: Number, default: 12 },
  width: { type: Number, default: 28 },
  height: { type: Number, default: 110 },
  text: { type: String, default: '' },
  image: { type: String, default: '' },
  imageFit: { type: String, enum: ['cover', 'contain'], default: 'cover' },
  color: { type: String, default: '#222222' },
  fontSize: { type: Number, default: 32 },
  sectionCanvasVersion: { type: Number, default: 0 },
}, { _id: false });

const portfolioSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  templateId: { type: String, default: 'professional-portfolio' },
  sections: { type: [sectionSchema], default: [] },
  canvasElements: { type: [canvasElementSchema], default: [] },
  templateContent: { type: [String], default: [] },
  templateImages: { type: [String], default: [] },
  theme: {
    accent: { type: String, default: '#e6e51e' },
    background: { type: String, default: '#ffffff' },
    section: { type: String, default: 'transparent' },
    font: { type: String, default: 'Inter' },
    layout: { type: String, default: 'modern' },
  },
  slug: { type: String, unique: true, sparse: true, index: true },
  published: { type: Boolean, default: false },
  visits: { type: Number, default: 0 },
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('Portfolio', portfolioSchema);
