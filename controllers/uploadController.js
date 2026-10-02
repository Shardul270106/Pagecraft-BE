const crypto = require('crypto');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,([a-z\d+/]+={0,2})$/i;

function isSecureCloudinaryUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && /^\/[a-z\d_-]+\/image\/upload\/.+/i.test(url.pathname);
  } catch {
    return false;
  }
}

function matchesImageType(bytes, type) {
  if (type === 'png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'gif') return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'));
  if (type === 'webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

exports.uploadImage = async (req, res) => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({ message: 'Image uploads are not configured on the server.' });
  }

  const dataUrl = req.body?.image;
  const match = typeof dataUrl === 'string' && dataUrl.match(DATA_URL_PATTERN);
  if (!match) return res.status(400).json({ message: 'Choose a PNG, JPEG, WebP, or GIF image.' });

  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || !matchesImageType(bytes, match[1].toLowerCase())) {
    return res.status(400).json({ message: 'Images must be valid PNG, JPEG, WebP, or GIF files no larger than 5 MB.' });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = `pagecraft/${req.user._id.toString()}`;
  const signedParameters = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(`${signedParameters}${apiSecret}`).digest('hex');
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('folder', folder);
  form.append('signature', signature);

  try {
    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    const result = await cloudinaryResponse.json().catch(() => ({}));
    if (!cloudinaryResponse.ok || !isSecureCloudinaryUrl(result.secure_url || '')) {
      return res.status(502).json({ message: 'Cloudinary could not store the image. Try again.' });
    }
    return res.status(201).json({ url: result.secure_url });
  } catch {
    return res.status(502).json({ message: 'Cloudinary could not be reached. Check your connection and try again.' });
  }
};
