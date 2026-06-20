# API Plan

## Public / Mobile
- POST /api/auth/request-otp
- POST /api/auth/verify-otp
- GET /api/cities
- GET /api/districts/:cityId
- GET /api/services
- POST /api/bookings
- GET /api/bookings/my
- GET /api/bookings/:id

## Admin
- POST /api/admin/login
- GET /api/admin/dashboard
- GET /api/admin/bookings
- GET /api/admin/bookings/:id
- PATCH /api/admin/bookings/:id/status
- PATCH /api/admin/bookings/:id/assign-artist
- GET/POST/PATCH /api/admin/artists
- GET/POST/PATCH /api/admin/services
- GET/POST/PATCH /api/admin/cities
- GET/POST/PATCH /api/admin/districts
