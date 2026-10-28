-- Additive migration: preserve all users, properties, and reservation history.
ALTER TABLE bookings ADD CONSTRAINT bookings_calendar_nights CHECK (nights = check_out - check_in) NOT VALID;
ALTER TABLE bookings VALIDATE CONSTRAINT bookings_calendar_nights;
ALTER TABLE bookings ADD CONSTRAINT bookings_id_listing_unique UNIQUE (id, listing_id);
ALTER TABLE booking_nights ADD CONSTRAINT booking_nights_matching_listing
  FOREIGN KEY (booking_id, listing_id) REFERENCES bookings(id, listing_id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings(created_at);
CREATE INDEX IF NOT EXISTS booking_nights_date_idx ON booking_nights(stay_date, listing_id);
