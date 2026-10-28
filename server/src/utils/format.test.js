import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingRecord, listingRecord } from './format.js';

test('listing records preserve the frontend API shape and numeric values', () => {
  const listing = listingRecord({
    id: 'listing-id',
    host_id: 'host-id',
    host_name: 'Aarav',
    title: 'A quiet escape',
    price: '3200',
    max_guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    average_rating: '4.8',
    review_count: 3,
    amenities: ['WiFi'],
    images: [{ url: 'https://example.com/photo.jpg' }]
  });
  assert.equal(listing._id, 'listing-id');
  assert.deepEqual(listing.host, { _id: 'host-id', name: 'Aarav' });
  assert.equal(listing.price, 3200);
  assert.equal(listing.averageRating, 4.8);
  assert.equal(listing.reviewCount, 3);
  assert.deepEqual(listing.images, [{ url: 'https://example.com/photo.jpg' }]);
});

test('booking records include guest and listing details expected by dashboards', () => {
  const booking = bookingRecord({
    id: 'booking-id',
    guest: { id: 'guest-id', name: 'Guest' },
    check_in: '2030-03-01',
    check_out: '2030-03-03',
    nights: 2,
    guests: 1,
    total: 6400,
    status: 'confirmed'
  }, { _id: 'listing-id', title: 'A quiet escape' });
  assert.equal(booking._id, 'booking-id');
  assert.equal(booking.guest.name, 'Guest');
  assert.equal(booking.listing.title, 'A quiet escape');
  assert.equal(booking.nights, 2);
  assert.equal(booking.total, 6400);
});
