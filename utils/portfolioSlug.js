const crypto = require('crypto');
const Portfolio = require('../models/Portfolio');

const slugify = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 48)
  .replace(/-$/g, '');

async function createPortfolioSlug(value, excludeId) {
  const base = slugify(value) || 'portfolio';
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
    const exists = await Portfolio.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!exists) return slug;
  }
  return `${base}-${crypto.randomBytes(4).toString('hex')}`;
}

module.exports = { slugify, createPortfolioSlug };
