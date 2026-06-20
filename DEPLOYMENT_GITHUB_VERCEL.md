# Beauty Home Service — GitHub / Vercel Deployment Guide

## 1. Project structure

Recommended repository structure:

```txt
Beauty V1/
├── backend
├── admin-dashboard
├── mobile-app
└── docs
```

Deploy `backend` and `admin-dashboard` as two separate Vercel projects from the same GitHub repository.

---

## 2. Cloud PostgreSQL

Create a PostgreSQL database using one of these services:

- Neon PostgreSQL
- Supabase PostgreSQL
- Vercel Marketplace PostgreSQL

Copy the connection string. It should look similar to:

```txt
postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Run the schema against the cloud database from the local machine:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" "YOUR_CLOUD_DATABASE_URL" -f ".\database\schema.sql"
```

If your cloud database requires SSL, keep `sslmode=require` in the connection string.

---

## 3. Local environment files

Backend local file:

```txt
backend/.env
```

Example:

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres123@localhost:5432/henna_booking
JWT_SECRET=local_test_secret
NODE_ENV=development
CORS_ORIGIN=*
PGSSLMODE=disable
```

Admin local file:

```txt
admin-dashboard/.env
```

Example:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

Do not commit real `.env` files to GitHub.

---

## 4. Push to GitHub

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1"
git init
git add .
git commit -m "Initial Beauty Home Service deployment-ready version"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/beauty-home-service.git
git push -u origin main
```

---

## 5. Deploy Backend to Vercel

Create a new Vercel project from the GitHub repository.

Settings:

```txt
Root Directory: backend
Framework Preset: Other
Build Command: leave default or empty
Output Directory: leave empty
Install Command: yarn install
```

Environment Variables:

```txt
DATABASE_URL=YOUR_CLOUD_DATABASE_URL
JWT_SECRET=replace_with_a_strong_secret
NODE_ENV=production
CORS_ORIGIN=*
```

After deploy, test:

```txt
https://YOUR-BACKEND.vercel.app/api/health
```

Expected response:

```json
{"ok":true,"app":"Beauty Home Service API"}
```

---

## 6. Deploy Admin Dashboard to Vercel

Create a second Vercel project from the same GitHub repository.

Settings:

```txt
Root Directory: admin-dashboard
Framework Preset: Vite
Build Command: yarn build
Output Directory: dist
Install Command: yarn install
```

Environment Variable:

```txt
VITE_API_BASE_URL=https://YOUR-BACKEND.vercel.app/api
```

After deploy, open the Admin Dashboard URL and test loading bookings, artists, services, cities, and districts.

---

## 7. Build Android APK connected to Vercel Backend

After Backend is live, build the APK using the backend URL:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://YOUR-BACKEND.vercel.app/api
```

The APK output will be here:

```txt
mobile-app\build\app\outputs\flutter-apk\app-release.apk
```

Install it on a phone outside the local network and create a test booking.

---

## 8. External phone test

1. Install the APK.
2. Open the app using mobile data or another Wi-Fi network.
3. Create a booking.
4. Open the Vercel Admin Dashboard.
5. Confirm the booking appears.
6. Update the status or assign an artist.
7. Open “My Bookings” on the phone and confirm the status is updated.

---

## 9. Daily local commands

Backend:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
yarn dev
```

Admin Dashboard:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
yarn dev
```

Mobile App local phone test:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" run --dart-define=API_BASE_URL=http://YOUR_PC_IP:4000/api
```
