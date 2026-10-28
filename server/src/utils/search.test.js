import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSearch } from './search.js';

test('search values remain parameters and pagination is bounded', () => {
  const query = buildSearch({ q: "Goa' OR 1=1 --", page: '2', limit: '12', minPrice: '100' });
  assert.equal(query.offset, 12);
  assert.equal(query.values[0], "Goa' OR 1=1 --");
  assert.ok(!query.where.includes('Goa'));
  assert.throws(() => buildSearch({ limit: '101' }));
  assert.throws(() => buildSearch({ guests: 'abc' }));
  assert.throws(() => buildSearch({ q: ['Goa', 'Delhi'] }));
  assert.throws(() => buildSearch({ minPrice: '500', maxPrice: '100' }));
});

test('availability search requires a valid complete date range and exclusive checkout', () => {
  assert.throws(() => buildSearch({ checkIn: '2035-01-01' }));
  assert.throws(() => buildSearch({ checkIn: '2035-02-30', checkOut: '2035-03-01' }));
  const query = buildSearch({ checkIn: '2035-01-01', checkOut: '2035-01-03' });
  assert.match(query.where, /stay_date < \$2::date/);
  assert.deepEqual(query.values, ['2035-01-01', '2035-01-03']);
});
