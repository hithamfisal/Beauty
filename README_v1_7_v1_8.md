# Beauty Home Service v1.7 + v1.8

## v1.7 - Image Upload, Notifications & Booking Workflow

### Backend
- Added `booking_events` table for request activity tracking.
- Added `contact_preference` and `alternate_time` fields to bookings.
- Added image upload endpoints:
  - `POST /api/uploads/design-image`
  - `POST /api/admin/uploads/image`
- If Cloudinary variables are configured, images are uploaded to Cloudinary.
- If Cloudinary is not configured, the image data URL is returned as a development fallback.
- Added admin notifications endpoint:
  - `GET /api/admin/notifications`
- Added booking events endpoints:
  - `GET /api/admin/bookings/:id/events`
  - `POST /api/admin/bookings/:id/events`
  - `GET /api/customer/bookings/:id/events?phone=...`

### Admin Dashboard
- Added order notification panel.
- Added image upload inputs for portfolio and booking design images.
- Added contact preference and alternate time fields.
- Added more detailed workflow event logging.

### Mobile App
- Added contact preference selection during booking.
- Added alternate time field.
- Updated version text to v1.8.

## v1.8 - WhatsApp Integration & Customer Communication

### Backend
- Added `communication_templates` table.
- Added default WhatsApp templates.
- Added admin APIs:
  - `GET /api/admin/communication-templates`
  - `POST /api/admin/communication-templates`
  - `PATCH /api/admin/communication-templates/:id`
  - `DELETE /api/admin/communication-templates/:id`
  - `POST /api/admin/bookings/:id/whatsapp`

### Admin Dashboard
- Added WhatsApp templates management.
- Added WhatsApp message preparation from the order table and notifications section.
- Template variables supported:
  - `{customer_name}`
  - `{booking_id}`
  - `{service_name}`
  - `{booking_date}`
  - `{booking_time}`
  - `{payment_status}`

## Cloudinary Configuration

Set these only in Backend `.env` or Vercel Backend Environment Variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Do not put these values in the mobile app or admin dashboard.

## Local Run

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
node src/server.js
```

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
npm run dev
```

## APK Build with Vercel Backend

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"

& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```
