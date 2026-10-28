import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool, transaction } from '../db.js';
import { signSession, clearSession, requireAuth, safeUser } from '../middleware/auth.js';
import { asyncHandler, requireId } from '../utils/http.js';

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes'),
  role: z.enum(['guest', 'host']).default('guest')
});

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role } = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, lower($2), $3, $4)
       RETURNING id, name, email, role`,
      [name, email, passwordHash, role]
    );
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email is already registered' });
    throw error;
  }
  const user = { ...result.rows[0], wishlist: [] };
  signSession(res, user);
  res.status(201).json({ user: safeUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const data = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(100) }).parse(req.body);
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.password_hash,
       COALESCE(array_agg(w.listing_id) FILTER (WHERE w.listing_id IS NOT NULL), '{}') AS wishlist
     FROM users u LEFT JOIN wishlists w ON w.user_id = u.id
     WHERE u.email = lower($1) GROUP BY u.id`,
    [data.email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  delete user.password_hash;
  signSession(res, user);
  res.json({ user: safeUser(user) });
}));

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => res.json({ user: safeUser(req.user) || null }));

router.post('/become-host', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query("UPDATE users SET role='host', updated_at=now() WHERE id=$1 RETURNING id, name, email, role", [req.user.id]);
  res.json({ user: safeUser({ ...result.rows[0], wishlist: req.user.wishlist }) });
}));

router.patch('/profile', requireAuth, asyncHandler(async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(80) }).parse(req.body);
  const result = await pool.query(
    'UPDATE users SET name=$2, updated_at=now() WHERE id=$1 RETURNING id, name, email, role',
    [req.user.id, name]
  );
  const user = { ...result.rows[0], wishlist: req.user.wishlist || [] };
  res.json({ user: safeUser(user) });
}));

router.post('/wishlist/:id', requireAuth, asyncHandler(async (req, res) => {
  requireId(req.params.id);
  try {
    const wishlist = await transaction(async client => {
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
      const deleted = await client.query(
        'DELETE FROM wishlists WHERE user_id = $1 AND listing_id = $2 RETURNING listing_id',
        [req.user.id, req.params.id]
      );
      if (deleted.rowCount === 0) {
        await client.query('INSERT INTO wishlists (user_id, listing_id) VALUES ($1, $2)', [req.user.id, req.params.id]);
      }
      const result = await client.query('SELECT listing_id FROM wishlists WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
      return result.rows.map(row => row.listing_id);
    });
    res.json({ wishlist });
  } catch (error) {
    if (error.code === '23503') return res.status(404).json({ error: 'Property not found' });
    throw error;
  }
}));

export default router;
