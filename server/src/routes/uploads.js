import { Router, raw } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { fileTypeFromBuffer } from 'file-type';
import { asyncHandler, fail } from '../utils/http.js';
import { requireAuth, requireHost } from '../middleware/auth.js';
import { rateLimit } from 'express-rate-limit';
const router = Router();
// A bounded binary body avoids multipart parser dependencies and filename handling.
router.post('/', requireAuth, requireHost, rateLimit({ windowMs: 60000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false }), raw({ type: 'application/octet-stream', limit: '5mb' }), asyncHandler(async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) fail('Send an image as application/octet-stream');
  let type;
  try { type = await fileTypeFromBuffer(req.body); }
  catch { fail('The image is incomplete or invalid'); }
  if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)) fail('Only JPEG, PNG and WebP images are allowed');
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) fail('Cloudinary is not configured. Use an HTTPS image URL instead.', 503);
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: `stayscape/${req.user.id}`, resource_type: 'image', timeout: 30000, transformation: [{ width: 1600, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] }, (error, data) => error ? reject(error) : resolve(data));
    stream.end(req.body);
  });
  res.status(201).json({ image: { url: result.secure_url, publicId: result.public_id } });
}));
export default router;
