import { Router } from 'express';
import { z } from 'zod';
import { pool, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, fail, requireId } from '../utils/http.js';
import { stayNights } from '../utils/date.js';
import { bookingRecord } from '../utils/format.js';

const router = Router();

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, EXISTS(SELECT 1 FROM reviews r WHERE r.booking_id=b.id) AS reviewed, jsonb_build_object(
       '_id', l.id, 'title', l.title, 'images', l.images, 'city', l.city, 'country', l.country, 'host', l.host_id
     ) AS listing
     FROM bookings b JOIN listings l ON l.id = b.listing_id
     WHERE b.guest_id = $1 ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json({ bookings: result.rows.map(row => bookingRecord(row, row.listing)) });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const data = z.object({
    listingId: z.string().uuid(),
    checkIn: z.string(),
    checkOut: z.string(),
    guests: z.coerce.number().int().min(1).max(30)
  }).parse(req.body);
  requireId(data.listingId);
  const dates = stayNights(data.checkIn, data.checkOut);
  let record;
  try {
    record = await transaction(async client => {
      const listingResult = await client.query(
        'SELECT id, host_id, price, max_guests FROM listings WHERE id=$1 FOR SHARE',
        [data.listingId]
      );
      const listing = listingResult.rows[0];
      if (!listing) fail('Property not found', 404);
      if (listing.host_id === req.user.id) fail('You cannot book your own listing');
      if (data.guests > listing.max_guests) fail(`This stay supports up to ${listing.max_guests} guests`);
      const inserted = await client.query(
        `INSERT INTO bookings (listing_id, guest_id, check_in, check_out, nights, guests, total)
         VALUES ($1,$2,$3::date,$4::date,$5,$6,$7) RETURNING *`,
        [listing.id, req.user.id, data.checkIn, data.checkOut, dates.length, data.guests, dates.length * listing.price]
      );
      for (const date of dates) {
        await client.query('INSERT INTO booking_nights (listing_id, booking_id, stay_date) VALUES ($1,$2,$3::date)',
          [listing.id, inserted.rows[0].id, date]);
      }
      return inserted.rows[0];
    });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Those dates are no longer available. Choose different dates.' });
    throw error;
  }
  res.status(201).json({ booking: bookingRecord(record) });
}));

router.patch('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const result = await transaction(async client => {
    const found = await client.query('SELECT * FROM bookings WHERE id=$1 AND guest_id=$2 FOR UPDATE', [req.params.id, req.user.id]);
    const booking = found.rows[0];
    if (!booking) fail('Reservation not found', 404);
    if (booking.status === 'cancelled') fail('Already cancelled', 409);
    if (booking.check_in <= new Date().toISOString().slice(0, 10)) fail('Cannot cancel a stay after check-in', 409);
    const updated = await client.query(
      `UPDATE bookings SET status='cancelled', updated_at=now() WHERE id=$1 RETURNING *`,
      [booking.id]
    );
    await client.query('DELETE FROM booking_nights WHERE booking_id=$1', [booking.id]);
    return updated.rows[0];
  });
  res.json({ booking: bookingRecord(result) });
}));

export default router;
