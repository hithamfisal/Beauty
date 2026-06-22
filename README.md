# Beauty Home Service

Booking and operations platform for at-home beauty services in Saudi Arabia.

## Applications

- `backend` — Node.js/Express API and PostgreSQL migrations
- `admin-dashboard` — React/Vite operations dashboard
- `customer-web` — React/Vite customer booking portal
- `mobile-app` — Flutter Android customer application
- `docs` — product, API, and database documentation

## Local development

Copy `backend/.env.example` to `backend/.env`, adjust the local PostgreSQL connection, then run:

```powershell
cd backend
npm install
npm run migrate
npm test
npm run dev
```

In separate terminals:

```powershell
npm --prefix admin-dashboard install
npm --prefix admin-dashboard run dev

npm --prefix customer-web install
npm --prefix customer-web run dev

cd mobile-app
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

## Database migrations

Migration files are stored in `backend/database/migrations` and tracked in the `schema_migrations` table with SHA-256 checksums. Run `npm run migrate` before starting a newly updated backend. Existing pre-migration databases are safely baselined before incremental migrations run.

## Verification

```powershell
npm --prefix backend test
npm --prefix admin-dashboard run build
npm --prefix customer-web run build

cd mobile-app
& "D:\flutter\bin\flutter.bat" analyze
& "D:\flutter\bin\flutter.bat" test
```

Backend end-to-end coverage includes booking creation, dependent location/service validation, booking status, payment, beautician assignment, normalized coverage matching, and OTP authentication.

## Production security

Production requires a strong `JWT_SECRET`, explicit `CORS_ALLOWED_ORIGINS`, non-default admin credentials, and configured SMS provider variables. OTP values are hashed at rest and are never returned by production API responses. See `backend/.env.example` for the required variables.

Deployment and Android signing notes remain in `DEPLOYMENT_GITHUB_VERCEL.md` and `README_ANDROID_RELEASE_SIGNING.md`.
