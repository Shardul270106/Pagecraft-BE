const crypto = require('crypto');
const Portfolio = require('../models/Portfolio');

const SECTION_TYPES = new Set(['header', 'about', 'services', 'skills', 'technical-skills', 'experience', 'education', 'projects', 'projects-work', 'process', 'outcome', 'testimonials', 'faq', 'gallery', 'contact', 'languages', 'awards', 'references']);
const TEMPLATE_IDS = new Set(['professional-portfolio', 'developer-portfolio', 'student-resume', 'creative-portfolio', 'ux-case-study', 'photographer-portfolio', 'folio-freelancer', 'grunge-portfolio', 'iportfolio-bootstrap', 'resume-blue-corporate', 'resume-black-white-a4', 'resume-minimalist-cv', 'editorial-studio-portfolio', 'midnight-creative-portfolio', 'product-designer-portfolio', 'architect-portfolio']);
const TEMPLATE_IMAGES = new Set(['/grunge/peter.jpg', '/grunge/peter2.jpg', '/resume-assets/minimalist-cv-avatar.jpg']);
const isCloudinaryImage = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && /^\/[a-z\d_-]+\/image\/upload\/.+/i.test(url.pathname);
  } catch {
    return false;
  }
};
const FONTS = new Set(['Inter', 'Poppins', 'DM Sans', 'Manrope', 'Space Grotesk', 'Montserrat', 'Playfair Display', 'Lora', 'Merriweather', 'Source Sans 3', 'Oswald', 'Georgia']);
const LAYOUTS = new Set(['modern', 'editorial', 'compact', 'folio', 'grunge', 'iportfolio', 'resume-blue-corporate', 'resume-black-white-a4', 'resume-minimalist-cv']);
const serialize = (portfolio) => ({ ...portfolio.toObject(), id: portfolio._id.toString() });

function cleanSections(sections) {
  if (!Array.isArray(sections) || sections.length > 50) return { error: 'A portfolio can contain up to 50 sections.' };
  const cleaned = [];
  for (const section of sections) {
    if (!section || !SECTION_TYPES.has(section.type) || typeof section.id !== 'string') return { error: 'A section has an unsupported type or identifier.' };
    const image = section.image || '';
    if (image && !TEMPLATE_IMAGES.has(image) && !isCloudinaryImage(image) && (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(image) || image.length > 7_000_000)) {
      return { error: 'Images must be PNG, JPEG, WebP, or GIF and no larger than 5 MB.' };
    }
    const number = (value) => Math.min(1200, Math.max(-1200, Number.isFinite(Number(value)) ? Number(value) : 0));
    cleaned.push({ id: section.id.slice(0, 120), type: section.type, title: String(section.title || '').slice(0, 250), body: String(section.body || '').slice(0, 20000), image, contentOffsetX: number(section.contentOffsetX), contentOffsetY: number(section.contentOffsetY) });
  }
  return { sections: cleaned };
}

function cleanCanvasElements(elements) {
  if (!Array.isArray(elements) || elements.length > 100) return { error: 'A page can contain up to 100 custom elements.' };
  const types = new Set(['text', 'image', 'rectangle', 'circle', 'line', 'icon']);
  const iconNames = new Set(['sparkles', 'star', 'heart', 'leaf', 'briefcase', 'camera']);
  const cleaned = [];
  for (const element of elements) {
    if (!element || typeof element.id !== 'string' || !types.has(element.type)) return { error: 'A custom element has an unsupported type or identifier.' };
    const image = String(element.image || '');
    if (image && !isCloudinaryImage(image) && !/^data:image\/(png|jpeg|webp|gif);base64,/.test(image)) return { error: 'Element images must be PNG, JPEG, WebP, GIF, or a Cloudinary image URL.' };
    if (image.length > 7_000_000) return { error: 'Element images may be up to 5 MB.' };
    const number = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : fallback));
    const color = /^#[\da-f]{3,8}$/i.test(element.color || '') ? element.color : '#222222';
    const sectionId = String(element.sectionId || '').slice(0, 120);
    const width = number(element.width, 28, 4, sectionId ? 100 : 96);
    cleaned.push({
      id: element.id.slice(0, 120), type: element.type, sectionId,
      x: number(element.x, 10, 0, sectionId ? Math.max(0, 100 - width) : 96), y: number(element.y, 12, 0, 99),
      width, height: number(element.height, 110, 8, 1200),
      text: String(element.text || '').slice(0, 4000), image, color,
      imageFit: element.imageFit === 'contain' ? 'contain' : 'cover',
      fontSize: number(element.fontSize, 32, 10, 120),
      sectionCanvasVersion: number(element.sectionCanvasVersion, 0, 0, 1),
      iconName: iconNames.has(element.iconName) ? element.iconName : 'sparkles',
    });
  }
  return { elements: cleaned };
}

function cleanTemplateContent(content) {
  if (!Array.isArray(content) || content.length > 2000) return { error: 'Template text content is too large.' };
  const cleaned = content.map((value) => String(value ?? '').slice(0, 4000));
  if (cleaned.reduce((total, value) => total + value.length, 0) > 100_000) return { error: 'Template text content is too large.' };
  return { content: cleaned };
}

function cleanTemplateImages(images) {
  if (!Array.isArray(images) || images.length > 30) return { error: 'Template images are too large.' };
  const cleaned = images.map((image) => String(image || ''));
  if (cleaned.some((image) => image && !isCloudinaryImage(image) && !/^data:image\/(png|jpeg|webp|gif);base64,/.test(image))) return { error: 'Template images must be PNG, JPEG, WebP, GIF, or a Cloudinary image URL.' };
  if (cleaned.some((image) => image.length > 7_000_000) || cleaned.reduce((total, image) => total + image.length, 0) > 7_000_000) return { error: 'Template image uploads may total up to 5 MB.' };
  return { images: cleaned };
}

function cleanTheme(theme = {}) {
  const validColor = (value, fallback) => /^#[\da-f]{3,8}$/i.test(value || '') ? value : fallback;
  return {
    accent: validColor(theme.accent, '#e6e51e'),
    background: validColor(theme.background, '#ffffff'),
    section: theme.section === 'transparent' ? 'transparent' : validColor(theme.section, 'transparent'),
    font: FONTS.has(theme.font) ? theme.font : 'Inter',
    layout: LAYOUTS.has(theme.layout) ? theme.layout : 'modern',
  };
}

exports.list = async (req, res) => {
  const portfolios = await Portfolio.find({ owner: req.user._id }).sort({ updatedAt: -1 });
  res.json(portfolios.map(serialize));
};

exports.create = async (req, res) => {
  const { title, templateId, sections, theme, templateContent, templateImages, canvasElements } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Give your portfolio a name.' });
  const result = cleanSections(sections || []);
  if (result.error) return res.status(400).json({ message: result.error });
  const templateResult = templateContent === undefined ? { content: [] } : cleanTemplateContent(templateContent);
  if (templateResult.error) return res.status(400).json({ message: templateResult.error });
  const imageResult = templateImages === undefined ? { images: [] } : cleanTemplateImages(templateImages);
  if (imageResult.error) return res.status(400).json({ message: imageResult.error });
  const elementsResult = canvasElements === undefined ? { elements: [] } : cleanCanvasElements(canvasElements);
  if (elementsResult.error) return res.status(400).json({ message: elementsResult.error });
  const portfolio = await Portfolio.create({ owner: req.user._id, title: title.trim().slice(0, 100), templateId: TEMPLATE_IDS.has(templateId) ? templateId : 'professional-portfolio', sections: result.sections, canvasElements: elementsResult.elements, theme: cleanTheme(theme), templateContent: templateResult.content, templateImages: imageResult.images });
  res.status(201).json(serialize(portfolio));
};

exports.get = async (req, res) => {
  const portfolio = await Portfolio.findOne({ _id: req.params.id, owner: req.user._id });
  if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });
  res.json(serialize(portfolio));
};

exports.update = async (req, res) => {
  const { title, templateId, sections, theme, templateContent, templateImages, canvasElements } = req.body;
  const portfolio = await Portfolio.findOne({ _id: req.params.id, owner: req.user._id });
  if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });
  if (title !== undefined) portfolio.title = String(title).trim().slice(0, 100) || portfolio.title;
  if (templateId !== undefined && TEMPLATE_IDS.has(templateId)) portfolio.templateId = templateId;
  if (sections !== undefined) {
    const result = cleanSections(sections);
    if (result.error) return res.status(400).json({ message: result.error });
    portfolio.sections = result.sections;
  }
  if (canvasElements !== undefined) {
    const result = cleanCanvasElements(canvasElements);
    if (result.error) return res.status(400).json({ message: result.error });
    portfolio.canvasElements = result.elements;
  }
  if (theme !== undefined) portfolio.theme = cleanTheme(theme);
  if (templateContent !== undefined) {
    const result = cleanTemplateContent(templateContent);
    if (result.error) return res.status(400).json({ message: result.error });
    portfolio.templateContent = result.content;
  }
  if (templateImages !== undefined) {
    const result = cleanTemplateImages(templateImages);
    if (result.error) return res.status(400).json({ message: result.error });
    portfolio.templateImages = result.images;
  }
  await portfolio.save();
  res.json(serialize(portfolio));
};

exports.remove = async (req, res) => {
  const portfolio = await Portfolio.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });
  res.status(204).end();
};

exports.duplicate = async (req, res) => {
  const source = await Portfolio.findOne({ _id: req.params.id, owner: req.user._id });
  if (!source) return res.status(404).json({ message: 'Portfolio not found.' });
  const copy = await Portfolio.create({
    owner: req.user._id,
    title: `${source.title} copy`,
    templateId: source.templateId,
    sections: source.sections,
    canvasElements: source.canvasElements,
    theme: source.theme,
    templateContent: source.templateContent,
    templateImages: source.templateImages,
  });
  res.status(201).json(serialize(copy));
};

exports.publish = async (req, res) => {
  const portfolio = await Portfolio.findOne({ _id: req.params.id, owner: req.user._id });
  if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });
  if (!portfolio.slug) portfolio.slug = crypto.randomBytes(8).toString('hex');
  portfolio.published = req.body.published !== false;
  await portfolio.save();
  const origin = (process.env.PUBLIC_CLIENT_URL || process.env.CLIENT_URL?.split(',')[0])?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
  res.json({ ...serialize(portfolio), publicUrl: `${origin}/p/${portfolio.slug}` });
};

exports.publicPage = async (req, res) => {
  const portfolio = await Portfolio.findOneAndUpdate(
    { slug: req.params.slug, published: true },
    { $inc: { visits: 1 } },
    { new: true },
  ).populate('owner', 'name');
  if (!portfolio) return res.status(404).json({ message: 'This portfolio is not published or no longer exists.' });
  const result = serialize(portfolio);
  result.ownerName = portfolio.owner?.name || '';
  delete result.owner;
  res.json(result);
};
