# Beauty Home Service Customer Web Portal v1.9

واجهة العميلة على الكمبيوتر والمتصفح.

## تشغيل محلي

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\customer-web"
npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
npm run dev
```

افتح الرابط الذي يظهر غالباً `http://localhost:5173` أو `http://localhost:5174`.

## متغير البيئة

أنشئ ملف `.env` داخل `customer-web`:

```env
VITE_API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

## نشر Vercel

- Project name: `beauty-customer-web`
- Root Directory: `customer-web`
- Framework Preset: `Vite`
- Install Command: `npm install --registry=https://registry.npmjs.org --fetch-timeout=900000`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://beauty-backend-taupe.vercel.app/api`
