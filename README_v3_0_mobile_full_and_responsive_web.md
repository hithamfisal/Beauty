# Beauty Home Service v3.0 - Mobile Full Features + Mobile Web Ready

## Scope

This version prepares the mobile app for customer testing and keeps the customer web portal suitable for opening from a phone browser when the customer does not want to install the APK.

## Mobile App included features

- Customer can use the app as:
  - Account login by phone number and OTP.
  - Guest booking without login.
- Saudi phone real mask: `05xxxxxxxx`.
- Booking form supports dependent dropdowns:
  - Service category filters services.
  - Region filters cities.
  - City filters districts.
  - If no parent selection is made, the child list shows all available options.
- Customer account booking auto-fills saved customer name, phone, and default address when available.
- Guest booking asks for the customer details inside the booking form.
- Beautician listing and details.
- Portfolio/work samples display.
- Preferred beautician selection.
- My bookings by account token or by phone number for guest users.
- Booking status timeline.
- Customer review after completed booking.

## Customer Web included fixes

- Customer web remains responsive for mobile browser usage.
- Dependent dropdown filtering now uses API parameters properly:
  - `/services?category_id=...`
  - `/cities?region_id=...`
  - `/districts?city_id=...`
  - `/districts?region_id=...`

## Backend included improvement

- Added optional OTP test mode for testing without SMS provider.
- Use this in Vercel backend while testing:

```env
CUSTOMER_OTP_DEV_MODE=true
```

When this is enabled, OTP is always `1234` and is returned in the API response for testing. Remove it or set it to `false` when real SMS provider is ready.

## Build APK

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"

& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

APK output:

```txt
mobile-app\build\app\outputs\flutter-apk\app-release.apk
```

## Deploy Web

After replacing the files, push to GitHub and redeploy:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1"

git add backend/src/server.js customer-web/src/main.jsx mobile-app/lib/main.dart mobile-app/pubspec.yaml README_v3_0_mobile_full_and_responsive_web.md
git commit -m "Prepare full mobile app features and responsive customer web"
git push origin main
```

Then redeploy:

- Backend
- Customer Web

Admin Dashboard does not need redeploy unless you changed admin files.
