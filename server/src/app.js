import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import { optionalAuth } from './middleware/auth.js';
import auth from './routes/auth.js';
import listings from './routes/listings.js';
import bookings from './routes/bookings.js';
import reviews from './routes/reviews.js';
import uploads from './routes/uploads.js';
import { pool } from './db.js';
import analytics from './routes/analytics.js';

const isProd = process.env.NODE_ENV === 'production';
export const app = express();
app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: isProd ? { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
    connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: []
  } } : false,
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));
app.use(express.json({ limit: '150kb' }));
app.use(cookieParser());
// Same-origin CSRF defense for cookie-authenticated write requests (Vite proxy works in local development).
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin) {
    try {
      const url = new URL(origin);
      const configured = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
      const allowed = configured ? origin === configured : url.host === req.get('host') || (!isProd && url.hostname === 'localhost' && url.port === '5173');
      if (!allowed) return res.status(403).json({ error: 'Cross-site requests are not allowed' });
    } catch { return res.status(403).json({ error: 'Invalid request origin' }); }
  } else if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site requests are not allowed' });
  next();
});
app.use('/api', rateLimit({ windowMs: 60000, limit: 240, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api', optionalAuth);
app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (error) {
    next(error);
  }
});
app.use('/api/auth', rateLimit({ windowMs: 15 * 60000, limit: 35, standardHeaders: 'draft-7', legacyHeaders: false }), auth);
app.use('/api/listings', listings);
app.use('/api/bookings', bookings);
app.use('/api/reviews', reviews);
app.use('/api/uploads', uploads);
app.use('/api/analytics', analytics);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
const here = path.dirname(fileURLToPath(import.meta.url));
const staticPath = path.resolve(here, '../../client/dist');
if (isProd) {
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => res.sendFile(path.join(staticPath, 'index.html')));
}
app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid form data' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large. Images must be at most 5 MB.' });
  if (error.code === '23514' || error.code === '22003') return res.status(400).json({ error: 'Value is outside the allowed range' });
  if (error.code === '40P01' || error.code === '40001') return res.status(409).json({ error: 'Another request changed these dates. Please retry.' });
  if (error.code === '23505') return res.status(409).json({ error: 'A record with these details already exists' });
  if (error.code === '22P02') return res.status(400).json({ error: 'Invalid ID or value' });
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error('Request failed:', error.code || error.name); res.status(500).json({ error: 'Unexpected server error' });
});
