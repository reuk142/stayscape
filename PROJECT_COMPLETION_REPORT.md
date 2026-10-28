# StayScape project completion report

## Delivered

- Replaced the Express API's Mongoose data layer with PostgreSQL (`pg`) and versioned SQL migrations for users, listings, wishlists, bookings, occupied nights, and reviews.
- Added startup migration execution and a Windows PowerShell setup guide with PostgreSQL environment placeholders.
- Reimplemented registration, login, logout, account profile updates, listing search/filtering/CRUD, wishlist, host reservations, booking history, cancellation, and reviews using parameterized SQL.
- Kept the existing React/Vite application and API response shapes working; added an editable profile page and updated the database setup guidance shown on listing-load failures.
- Preserved Cloudinary uploads, Leaflet/OpenStreetMap property maps, host and guest roles, reviews, listing ownership checks, and simulated (non-payment) booking totals.
- Made booking creation and cancellation transactional. A PostgreSQL primary key on `(listing_id, stay_date)` prevents concurrent overlapping stays from both committing.
- Reworked sample seeding to use PostgreSQL and a private `SEED_DEMO_PASSWORD`; removed MongoDB packages from the server manifest and lockfile.
- Updated the README with Windows PowerShell setup, migration, seed, run, feature, and security instructions.
- Added unit tests for date rules and client-facing database record serialization.
- Aligned trip cancellation and review action dates with the backend's UTC calendar checks and added client utility tests.

## Verification performed

| Check | Result |
| --- | --- |
| Client production build | Passed |
| Backend and client unit tests | 7 passed (5 backend, 2 client) |
| Backend JavaScript syntax checks | 16 files passed |
| Vite development server smoke check | HTTP 200; served the StayScape document |
| Dependency audits (root, client, server) | 0 vulnerabilities reported |
| MongoDB/Mongoose references in source, manifests, lockfile, setup script, and README | None found |

## Remaining validation and setup

- PostgreSQL is not installed or available on `PATH` in this environment. The migration and seed commands, live API startup, and database-backed auth/permissions/booking-conflict tests could not be run here.
- Browser automation could not launch because the Playwright Chromium executable is not installed. The Vite HTTP smoke check passed; no browser package was installed just for this check.
- Before running the project, install/start PostgreSQL 18, create the `stayscape` database, and set `DATABASE_URL`, `JWT_SECRET`, and `SEED_DEMO_PASSWORD` in the local ignored `server\.env`. Cloudinary settings are optional unless image uploads are needed.
- No real payment processing is implemented by design.

See [README.md](./README.md) for exact Windows PowerShell setup and start commands.
