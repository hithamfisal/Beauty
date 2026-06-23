# Beauty Home Service — v3.5 / v3.6 UI/UX Update

## Scope

This package applies the approved **Luxury Soft Beauty** visual direction to the customer web app and admin dashboard foundations.

## v3.5 UI/UX Foundation

Implemented:

- Added shared visual identity direction using Rose Gold, Ivory, Soft Pink, Cream Gold, Rich Charcoal, and Soft Mocha.
- Added Google Font imports for `Almarai` and `Poppins`.
- Introduced CSS variables for colors, spacing feel, border radius, shadows, and UI surfaces.
- Updated global layout direction for Arabic RTL.
- Unified common UI components visually:
  - Buttons
  - Inputs
  - Selects
  - Cards
  - Panels
  - Status badges
  - Booking cards
  - Empty states
  - Tables in admin dashboard
- Improved responsive behavior for customer pages and admin dashboard.

## v3.6 Customer App Redesign

Implemented in `customer-web`:

- Redesigned header and navigation with premium pill style.
- Redesigned hero section with Luxury Soft Beauty visual style.
- Redesigned customer access/login strip.
- Redesigned Home screen with:
  - Premium welcome block
  - Search-style booking CTA
  - Feature cards
  - KPI-style quick counters
  - Category cards
  - Featured portfolio cards
  - Featured beauticians cards
- Redesigned Booking screen with:
  - Booking journey header
  - Multi-step visual indicators
  - Improved booking form layout
  - Better booking summary block
  - Related portfolio section
  - Suitable beauticians section
- Improved card styling for:
  - Portfolio
  - Beauticians
  - Tracking bookings
  - My Bookings / Account

## Admin Dashboard Visual Foundation

Implemented in `admin-dashboard`:

- Applied Luxury Soft Beauty variables and fonts.
- Improved admin shell colors.
- Improved RTL sidebar visual style.
- Improved dashboard header card.
- Improved KPI cards.
- Improved tables, filters, panels, modal, login card, and analytics visual language.
- Kept existing admin logic and backup features unchanged.

## Important Notes

- No backend business logic was changed.
- No database schema changes were required.
- The backup feature from the previous version remains in place.
- Advanced features such as online payment, OTP SMS integration, real-time tracking, maps, promo codes, and ratings are still future phases unless already present as placeholders.

## Build Test

Both frontends were tested successfully:

```bash
cd customer-web
npm run build

cd admin-dashboard
npm run build
```

## Recommended Next Phase

v3.7 Admin Dashboard Redesign:

- Improve Bookings Management table.
- Improve Booking Details page.
- Add stronger visual status workflow.
- Add admin notes and artist assignment UX polish.
- Improve Services, Categories, Cities, Districts, and Artists management pages.
