# Beauty Home Service v1.6 - Portfolio, Reviews & Customer Selection

## المنفذ في الإصدار

### Backend + Database
- إضافة جدول `beautician_portfolio` لمعرض أعمال خبيرات التجميل.
- إضافة جدول `beautician_reviews` لتقييمات العميلات.
- إضافة حقل `preferred_artist_id` في جدول `bookings` لاختيار خبيرة مفضلة من العميلة.
- إضافة APIs عامة للجوال:
  - `GET /api/beauticians`
  - `GET /api/beauticians/:id`
  - `GET /api/portfolio`
  - `POST /api/customer/reviews`
- إضافة APIs إدارية:
  - `GET/POST/PATCH/DELETE /api/admin/beautician-portfolio`
  - `GET /api/admin/beautician-reviews`

### Admin Dashboard
- إضافة قسم جديد: معرض أعمال خبيرات التجميل.
- إضافة/تعديل/حذف نموذج عمل لكل خبيرة.
- ربط نموذج العمل بقسم خدمة وخدمة.
- عرض تقييمات العميلات داخل لوحة الإدارة.
- عرض الخبيرة المفضلة والخبيرة المعينة داخل جدول الطلبات وتفاصيل الطلب.

### Mobile App
- إضافة صفحة خبيرات التجميل.
- إضافة صفحة تفاصيل خبيرة التجميل مع معرض الأعمال والتقييمات.
- عرض نماذج أعمال مشابهة بعد اختيار الخدمة.
- إمكانية اختيار خبيرة مفضلة أثناء الحجز.
- إضافة تقييم الخبيرة بعد اكتمال الطلب.

## التشغيل المحلي

Backend:
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
node src/server.js
```

Admin:
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
npm run dev
```

Mobile:
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" run --dart-define=API_BASE_URL=http://192.168.8.56:4000/api
```

## بناء APK على Vercel Backend

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

## ملاحظات
- الصور حالياً تحفظ كرابط `image_url`، ولا يتم رفعها مباشرة إلى التخزين السحابي.
- في v1.7 يفضل إضافة Cloudinary أو Supabase Storage لرفع الصور من لوحة الإدارة.
