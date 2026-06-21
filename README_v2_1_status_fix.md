# Beauty Home Service v2.1 - Booking Status Transition Fix

## Fixed

- Fixed booking status transition from the admin bookings table.
- Fixed booking status transition from the booking details modal.
- Added backend validation for allowed booking statuses.
- Added legacy status mapping:
  - `artist_assigned` -> `beautician_assigned`
  - `pending` -> `under_review`
  - `canceled` -> `cancelled`
  - `unavailable` -> `cancelled`
- Improved admin error messages when the backend returns non-JSON errors.
- Added optimistic UI update and reload after status changes.
- Status changes now return a structured response:
  - `ok`
  - `booking`
  - `status`
  - `label`

## Main endpoint

```http
PATCH /api/admin/bookings/:id/status
```

Payload:

```json
{
  "status": "confirmed"
}
```

Allowed values:

```txt
new
under_review
waiting_customer_confirmation
confirmed
beautician_assigned
in_progress
completed
cancelled
```

## Run locally

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
node src/server.js
```

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
npm run dev
```

## Deploy

After replacing files:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1"
git add .
git commit -m "Fix booking status transitions"
git push origin main
```

Redeploy backend first, then admin dashboard.
