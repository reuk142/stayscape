import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireHost } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.get('/', requireAuth, requireHost, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    WITH months AS (
      SELECT generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS month
    )
    SELECT to_char(m.month, 'YYYY-MM') AS month,
      count(b.id)::integer AS reservations,
      COALESCE(sum(b.total) FILTER (WHERE b.status='confirmed'), 0)::bigint AS "bookedValue",
      count(b.id) FILTER (WHERE b.status='cancelled')::integer AS cancellations
    FROM months m LEFT JOIN (bookings b JOIN listings l ON l.id=b.listing_id AND l.host_id=$1)
      ON date_trunc('month', b.created_at)=m.month
    GROUP BY m.month ORDER BY m.month`, [req.user.id]);
  const occupancy = await pool.query(`
    SELECT count(*)::integer AS nights FROM booking_nights n JOIN listings l ON l.id=n.listing_id
    WHERE l.host_id=$1 AND n.stay_date >= (now() AT TIME ZONE 'UTC')::date
      AND n.stay_date < (now() AT TIME ZONE 'UTC')::date + 30`, [req.user.id]);
  res.json({ months: result.rows.map(row => ({ ...row, bookedValue: Number(row.bookedValue) })), occupiedNightsNext30: occupancy.rows[0].nights });
}));
export default router;
