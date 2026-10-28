CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL,
  email varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role varchar(8) NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'host')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title varchar(110) NOT NULL,
  description varchar(4000) NOT NULL,
  city varchar(90) NOT NULL,
  country varchar(90) NOT NULL,
  address varchar(240) NOT NULL DEFAULT '',
  category varchar(32) NOT NULL DEFAULT 'Design'
    CHECK (category IN ('Beachfront', 'Cabins', 'Mountains', 'Design', 'City', 'Countryside', 'Amazing views')),
  price integer NOT NULL CHECK (price BETWEEN 100 AND 10000000),
  max_guests integer NOT NULL CHECK (max_guests BETWEEN 1 AND 30),
  bedrooms integer NOT NULL DEFAULT 1 CHECK (bedrooms BETWEEN 1 AND 30),
  beds integer NOT NULL DEFAULT 1 CHECK (beds BETWEEN 1 AND 50),
  bathrooms integer NOT NULL DEFAULT 1 CHECK (bathrooms BETWEEN 1 AND 30),
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  coordinates jsonb,
  average_rating numeric(2,1) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_host_id_idx ON listings(host_id);
CREATE INDEX IF NOT EXISTS listings_category_price_idx ON listings(category, price);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS listings_host_title_idx ON listings(host_id, title);

CREATE TABLE IF NOT EXISTS wishlists (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  guest_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer NOT NULL CHECK (nights BETWEEN 1 AND 60),
  guests integer NOT NULL CHECK (guests BETWEEN 1 AND 30),
  total integer NOT NULL CHECK (total >= 0),
  status varchar(12) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
CREATE INDEX IF NOT EXISTS bookings_guest_created_idx ON bookings(guest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_listing_idx ON bookings(listing_id);

CREATE TABLE IF NOT EXISTS booking_nights (
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stay_date date NOT NULL,
  PRIMARY KEY (listing_id, stay_date)
);
CREATE INDEX IF NOT EXISTS booking_nights_booking_idx ON booking_nights(booking_id);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment varchar(1200) NOT NULL CHECK (char_length(comment) BETWEEN 10 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_listing_created_idx ON reviews(listing_id, created_at DESC);
