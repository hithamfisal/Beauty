# Beauty Home Service Backend

## Run
```bash
npm install
cp .env.example .env
npm run dev
```

## Database
Create PostgreSQL database then run:
```bash
psql -d henna_booking -f database/schema.sql
```

## v1.2/v1.3 endpoints

Customer app:
- GET /api/customer/catalog
- GET /api/customer/bookings?phone=05...
- GET /api/customer/bookings/:id?phone=05...
- POST /api/auth/request-otp
- POST /api/auth/verify-otp
- POST /api/uploads/design-image

Artist operations:
- GET /api/admin/artists/:id/profile
- GET /api/admin/artist-availability
- POST /api/admin/artist-availability
- DELETE /api/admin/artist-availability/:id
- GET /api/admin/artist-reviews
- POST /api/admin/artist-reviews
- DELETE /api/admin/artist-reviews/:id

The backend automatically creates v1.3 tables if missing.
