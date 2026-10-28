import { Router } from 'express';
import { z } from 'zod';
import { pool, transaction } from '../db.js';
import { requireAuth, requireHost } from '../middleware/auth.js';
import { asyncHandler, fail, requireId, httpsImage } from '../utils/http.js';
import { listingRecord, bookingRecord } from '../utils/format.js';
import { buildSearch } from '../utils/search.js';

const router = Router();
const photo = z.object({
  url: z.string().url().refine(httpsImage, 'Use an HTTPS image URL'),
  publicId: z.string().max(200).optional().default('')
});
const fields = z.object({
  title: z.string().trim().min(8).max(110),
  description: z.string().trim().min(40).max(4000),
  city: z.string().trim().min(2).max(90),
  country: z.string().trim().min(2).max(90),
  address: z.string().max(240).default(''),
  category: z.enum(['Beachfront', 'Cabins', 'Mountains', 'Design', 'City', 'Countryside', 'Amazing views']).default('Design'),
  price: z.coerce.number().int().min(100).max(10000000),
  maxGuests: z.coerce.number().int().min(1).max(30),
  bedrooms: z.coerce.number().int().min(1).max(30).default(1),
  beds: z.coerce.number().int().min(1).max(50).default(1),
  bathrooms: z.coerce.number().int().min(1).max(30).default(1),
  amenities: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  images: z.array(photo).min(1).max(8),
  coordinates: z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }).optional()
});
const listingFields = `l.*, u.name AS host_name`;
const listingJoin = `FROM listings l JOIN users u ON u.id = l.host_id`;

router.get('/', asyncHandler(async (req, res) => {
  const search = buildSearch(req.query);
  const data = await transaction(async client => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const count = await client.query(`SELECT count(*)::integer AS total FROM listings l ${search.where}`, search.values);
    const values = [...search.values, search.limit, search.offset];
    const result = await client.query(
      `SELECT ${listingFields} ${listingJoin} ${search.where} ORDER BY ${search.order} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { listings: result.rows.map(listingRecord), total: count.rows[0].total, page: search.page, limit: search.limit };
  });
  res.json(data);
}));

router.get('/mine', requireAuth, requireHost, asyncHandler(async (req, res) => {
  const listingsResult = await pool.query(
    `SELECT ${listingFields} ${listingJoin} WHERE l.host_id = $1 ORDER BY l.created_at DESC`,
    [req.user.id]
  );
  const bookingsResult = await pool.query(
    `SELECT b.*, jsonb_build_object(
       '_id', l.id, 'title', l.title, 'images', l.images, 'city', l.city, 'country', l.country
     ) AS listing,
     jsonb_build_object('id', g.id, 'name', g.name, 'email', g.email) AS guest
     FROM bookings b JOIN listings l ON l.id = b.listing_id JOIN users g ON g.id = b.guest_id
     WHERE l.host_id = $1 ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json({
    listings: listingsResult.rows.map(listingRecord),
    bookings: bookingsResult.rows.map(row => bookingRecord({ ...row, guest: row.guest }, row.listing))
  });
}));

router.get('/wishlist', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT ${listingFields} ${listingJoin}
     JOIN wishlists w ON w.listing_id = l.id
     WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
    [req.user.id]
  );
  res.json({ listings: result.rows.map(listingRecord) });
}));

router.get('/:id/availability', asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const exists = await pool.query('SELECT 1 FROM listings WHERE id=$1', [req.params.id]);
  if (!exists.rowCount) fail('Property not found', 404);
  const result = await pool.query("SELECT stay_date FROM booking_nights WHERE listing_id = $1 AND stay_date >= (now() AT TIME ZONE 'UTC')::date ORDER BY stay_date", [req.params.id]);
  res.json({ bookedDates: result.rows.map(row => row.stay_date) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const result = await pool.query(`SELECT ${listingFields} ${listingJoin} WHERE l.id = $1`, [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Property not found' });
  const reviewsResult = await pool.query(
    `SELECT r.id AS "_id", r.rating, r.comment, r.created_at AS "createdAt",
       jsonb_build_object('name', u.name) AS author
     FROM reviews r JOIN users u ON u.id = r.author_id
     WHERE r.listing_id = $1 ORDER BY r.created_at DESC LIMIT 40`,
    [req.params.id]
  );
  res.json({ listing: listingRecord(result.rows[0]), reviews: reviewsResult.rows });
}));

router.post('/', requireAuth, requireHost, asyncHandler(async (req, res) => {
  const data = fields.parse(req.body);
  const result = await pool.query(
    `INSERT INTO listings
      (host_id, title, description, city, country, address, category, price, max_guests, bedrooms, beds, bathrooms, amenities, images, coordinates)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb)
     RETURNING *`,
    [req.user.id, data.title, data.description, data.city, data.country, data.address, data.category, data.price,
      data.maxGuests, data.bedrooms, data.beds, data.bathrooms, JSON.stringify(data.amenities),
      JSON.stringify(data.images), JSON.stringify(data.coordinates || null)]
  );
  res.status(201).json({ listing: listingRecord({ ...result.rows[0], host_name: req.user.name }) });
}));

router.put('/:id', requireAuth, requireHost, asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const data = fields.parse(req.body);
  const result = await pool.query(
    `UPDATE listings SET title=$3, description=$4, city=$5, country=$6, address=$7, category=$8, price=$9,
       max_guests=$10, bedrooms=$11, beds=$12, bathrooms=$13, amenities=$14::jsonb, images=$15::jsonb,
       coordinates=$16::jsonb, updated_at=now()
     WHERE id=$1 AND host_id=$2 RETURNING *`,
    [req.params.id, req.user.id, data.title, data.description, data.city, data.country, data.address, data.category,
      data.price, data.maxGuests, data.bedrooms, data.beds, data.bathrooms, JSON.stringify(data.amenities),
      JSON.stringify(data.images), JSON.stringify(data.coordinates || null)]
  );
  if (result.rowCount) return res.json({ listing: listingRecord({ ...result.rows[0], host_name: req.user.name }) });
  const exists = await pool.query('SELECT 1 FROM listings WHERE id=$1', [req.params.id]);
  if (!exists.rowCount) return res.status(404).json({ error: 'Property not found' });
  fail('Only the owner can edit this listing', 403);
}));

router.delete('/:id', requireAuth, requireHost, asyncHandler(async (req, res) => {
  requireId(req.params.id);
  await transaction(async client => {
    const found = await client.query('SELECT id, host_id FROM listings WHERE id=$1 FOR UPDATE', [req.params.id]);
    const listing = found.rows[0];
    if (!listing) fail('Property not found', 404);
    if (listing.host_id !== req.user.id) fail('Only the owner can delete this listing', 403);
    const history = await client.query('SELECT 1 FROM bookings WHERE listing_id=$1 LIMIT 1', [req.params.id]);
    if (history.rowCount) fail('This property has booking history and cannot be deleted. Editing is allowed.', 409);
    await client.query('DELETE FROM listings WHERE id=$1 AND host_id=$2', [req.params.id, req.user.id]);
  });
  res.json({ ok: true });
}));

export default router;
