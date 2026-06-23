# Database Backup from Admin Dashboard

## Added feature

A new Admin Dashboard section was added:

`مدير النظام > النسخ الاحتياطي`

It supports:

1. Backup local PostgreSQL database.
2. Backup Supabase cloud PostgreSQL database.
3. Save generated SQL backups in the backend `backups` folder.
4. Download backup files from the Admin Dashboard.
5. List previously generated backups.

## Backend environment variables

Add these values to `backend/.env`:

```env
# Main local database used by the backend
DATABASE_URL=postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/beauty_db

# Optional explicit local backup database URL.
# If omitted, DATABASE_URL will be used for local backup.
LOCAL_DATABASE_URL=postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/beauty_db

# Supabase database URL. Keep this only inside backend/.env.
SUPABASE_DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_SUPABASE_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require

# Required if pg_dump is not available in Windows PATH.
PG_DUMP_PATH=C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe

# Optional backup folder. Default is backend/backups.
BACKUP_DIR=./backups
```

## Important security note

Never put database passwords or Supabase connection strings inside React, Vite, admin-dashboard, customer-web, or mobile app files.

All backup credentials must remain in `backend/.env` only.

## How to test

From `backend`:

```powershell
npm install
npm run dev
```

From `admin-dashboard`:

```powershell
npm install
npm run dev
```

Open the Admin Dashboard and go to:

`مدير النظام > النسخ الاحتياطي`

Then test:

1. `نسخة احتياطية من المحلي`
2. `نسخة احتياطية من Supabase`
3. Download the generated `.sql` file.

## If backup fails with pg_dump not found

Run this in PowerShell:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --version
```

If it works, set:

```env
PG_DUMP_PATH=C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe
```

If your PostgreSQL version is different, change `18` to your installed version.
