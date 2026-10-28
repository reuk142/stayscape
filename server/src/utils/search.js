import { z } from 'zod';
import { stayNights } from './date.js';

export const categories = ['Beachfront', 'Cabins', 'Mountains', 'Design', 'City', 'Countryside', 'Amazing views'];
const optionalNumber = (min, max) => z.preprocess(value => value === '' ? undefined : value, z.coerce.number().int().min(min).max(max).optional());
const schema = z.object({
  q: z.string().trim().max(100).default(''),
  category: z.enum(['All', ...categories]).optional(),
  minPrice: optionalNumber(0, 10000000),
  maxPrice: optionalNumber(0, 10000000),
  guests: optionalNumber(1, 30),
  sort: z.enum(['new', 'low', 'high', 'rating']).default('new'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  checkIn: z.string().optional(),
  checkOut: z.string().optional()
}).refine(data => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, 'Minimum price must not exceed maximum price');

export function buildSearch(query) {
  const input = schema.parse(query);
  const values = [];
  const conditions = [];
  const add = (sql, value) => { values.push(value); conditions.push(sql.replaceAll('?', `$${values.length}`)); };
  if (input.q) add("(l.title ILIKE '%' || ? || '%' OR l.city ILIKE '%' || ? || '%' OR l.country ILIKE '%' || ? || '%')", input.q);
  if (input.category && input.category !== 'All') add('l.category = ?', input.category);
  if (input.minPrice !== undefined) add('l.price >= ?', input.minPrice);
  if (input.maxPrice !== undefined) add('l.price <= ?', input.maxPrice);
  if (input.guests !== undefined) add('l.max_guests >= ?', input.guests);
  if (input.checkIn || input.checkOut) {
    stayNights(input.checkIn, input.checkOut);
    values.push(input.checkIn, input.checkOut);
    conditions.push(`NOT EXISTS (SELECT 1 FROM booking_nights n WHERE n.listing_id=l.id AND n.stay_date >= $${values.length - 1}::date AND n.stay_date < $${values.length}::date)`);
  }
  const order = { new: 'l.created_at DESC', low: 'l.price ASC', high: 'l.price DESC', rating: 'l.average_rating DESC, l.review_count DESC' }[input.sort];
  return { ...input, values, where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', order: `${order}, l.id`, offset: (input.page - 1) * input.limit };
}
