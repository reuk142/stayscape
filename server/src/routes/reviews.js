import { Router } from 'express';
import { z } from 'zod';
import { transaction } from '../db.js';
import { asyncHandler, fail, requireId } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const input = z.object({
    bookingId: z.string().uuid(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().min(10).max(1200)
  }).parse(req.body);
  requireId(input.bookingId);

  let review;
  try {
    review = await transaction(async client => {
      const bookingResult = await client.query(
        `SELECT id, listing_id, status, check_out FROM bookings WHERE id=$1 AND guest_id=$2 FOR UPDATE`,
        [input.bookingId, req.user.id]
      );
      const booking = bookingResult.rows[0];
      if (!booking) fail('Reservation not found', 404);
      if (booking.status !== 'confirmed' || booking.check_out > new Date().toISOString().slice(0, 10)) {
        fail('Reviews are available after completed stays', 403);
      }
      // Serialize aggregate updates across reviews of different stays at the same listing.
      await client.query('SELECT id FROM listings WHERE id=$1 FOR UPDATE', [booking.listing_id]);
      const inserted = await client.query(
        `INSERT INTO reviews (listing_id, booking_id, author_id, rating, comment)
         VALUES ($1,$2,$3,$4,$5) RETURNING id AS "_id", rating, comment, created_at AS "createdAt"`,
        [booking.listing_id, booking.id, req.user.id, input.rating, input.comment]
      );
      await client.query(
        `UPDATE listings SET
           average_rating = (SELECT round(avg(rating)::numeric, 1) FROM reviews WHERE listing_id=$1),
           review_count = (SELECT count(*)::integer FROM reviews WHERE listing_id=$1),
           updated_at = now()
         WHERE id=$1`,
        [booking.listing_id]
      );
      return inserted.rows[0];
    });
  } catch (error) {
    if (error.code === '23505') fail('You already reviewed this stay', 409);
    throw error;
  }
  res.status(201).json({ review });
}));
export default router;
