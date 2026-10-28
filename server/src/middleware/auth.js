import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export function signSession(res, user) {
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256', issuer: 'stayscape', audience: 'stayscape-web' });
  res.cookie('stayscape_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 3600000,
    path: '/'
  });
}

export function clearSession(res) {
  res.clearCookie('stayscape_session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

export function safeUser(user) {
  return user && { id: user.id, name: user.name, email: user.email, role: user.role, wishlist: user.wishlist || [] };
}

export async function optionalAuth(req, _res, next) {
  const token = req.cookies?.stayscape_session;
  if (!token) return next();
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'stayscape', audience: 'stayscape-web' });
  } catch {
    return next();
  }
  if (typeof payload.sub !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.sub)) return next();
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role,
        COALESCE(array_agg(w.listing_id) FILTER (WHERE w.listing_id IS NOT NULL), '{}') AS wishlist
       FROM users u LEFT JOIN wishlists w ON w.user_id = u.id
       WHERE u.id = $1 GROUP BY u.id`,
      [payload.sub]
    );
    req.user = result.rows[0] || null;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in first' });
  next();
}

export function requireHost(req, res, next) {
  if (req.user.role !== 'host') return res.status(403).json({ error: 'A host account is required' });
  next();
}
