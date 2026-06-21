# Beauty Home Service v1.5

## المنفذ

1. إضافة تسجيل دخول للوحة الإدارة وحماية مسارات `/api/admin/*` باستخدام JWT.
2. تحسين تفاصيل الطلب داخل لوحة الإدارة مع تعيين خبيرة التجميل وتغيير الحالة والتواصل عبر واتساب.
3. تحسين صفحة "طلباتي" في تطبيق الجوال مع Timeline للحالة.
4. إضافة حقل رابط صورة التصميم داخل نموذج الطلب، ويظهر في تفاصيل الطلب داخل الإدارة عند توفره.
5. تطوير إدارة خبيرات التجميل وإبقاء الخبرة الأساسية والموقع والخدمات ضمن النموذج.
6. تجهيز أوامر بناء APK v1.5 مربوط بـ Vercel Backend.
7. إضافة قائمة اختبار محدود للمستخدمين.

## بيانات دخول لوحة الإدارة

محلياً عند أول تشغيل سيتم إنشاء مستخدم افتراضي:

- Email: `admin@beauty.local`
- Password: `Beauty@12345`

للإنتاج ضع القيم التالية في Backend Environment Variables على Vercel قبل النشر:

```env
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=strong_password
JWT_SECRET=very_strong_secret
```

## تشغيل Backend

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
yarn install
node src/server.js
```

## تشغيل Admin

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
npm run dev
```

## بناء APK مربوط بـ Vercel

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

## اختبار محدود

1. تثبيت APK على 3 إلى 5 أجهزة.
2. إنشاء طلب من كل جهاز.
3. متابعة الطلب من صفحة طلباتي.
4. فتح لوحة الإدارة وتسجيل الدخول.
5. تعيين خبيرة تجميل للطلب.
6. تغيير الحالة إلى تم تأكيد الحجز ثم مكتمل.
7. التأكد أن الحالة تظهر في الجوال.

## ملاحظات

- لا تستخدم رابط Admin في بناء APK.
- التطبيق يجب أن يستخدم Backend فقط: `https://beauty-backend-taupe.vercel.app/api`.
- Admin Dashboard يجب أن يستخدم `VITE_API_BASE_URL` بنفس رابط Backend.
