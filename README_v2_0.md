# Beauty Home Service v2.0 - Booking Operations

## الهدف
تحسين نظام تشغيل الطلبات ليصبح مناسباً للعمل اليومي عبر الإدارة والعميلة والويب والجوال.

## المضاف في v2.0

### Backend + Database
- إضافة رقم طلب واضح `booking_number` بصيغة مثل `BHS-2026-000001`.
- إضافة مصدر الطلب `booking_source`: `mobile`, `web`, `admin`, `legacy`.
- إضافة حقول تشغيلية:
  - `last_status_change_at`
  - `confirmed_at`
  - `completed_at`
  - `cancelled_at`
- توحيد حالة تعيين الخبيرة إلى `beautician_assigned`.
- إضافة سجل أحداث موسع للطلب من خلال `booking_events`.
- إضافة endpoint تشغيلي:
  - `GET /api/admin/bookings/:id/operations`

### Admin Dashboard
- عرض رقم الطلب بدلاً من الرقم التسلسلي فقط.
- عرض مصدر الطلب في جدول الطلبات.
- فتح تفاصيل الطلب بجلب البيانات الكاملة من Backend.
- إضافة سجل أحداث الطلب داخل نافذة التفاصيل.
- استمرار التحكم السريع في حالة الطلب وحالة الدفع وتعيين الخبيرة.

### Customer Web
- إنشاء الطلب مع مصدر `web`.
- إظهار رقم الطلب الحقيقي بعد الإرسال.
- عرض رقم الطلب في صفحة متابعة الطلب.

### Mobile App
- إنشاء الطلب مع مصدر `mobile`.
- إظهار رقم الطلب الحقيقي بعد الإرسال.
- عرض رقم الطلب داخل بطاقة الطلب في صفحة طلباتي.
- تحديث Timeline لاستخدام `beautician_assigned`.

## التشغيل المحلي

### Backend
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
node src/server.js
```

### Admin
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
npm run dev
```

### Customer Web
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\customer-web"
npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
npm run dev
```

### Mobile APK
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

## النشر
- ارفع التعديلات إلى GitHub.
- أعد نشر Backend على Vercel أولاً.
- أعد نشر Admin Dashboard.
- أعد نشر Customer Web.
- ابنِ APK جديد للجوال.

## اختبار مهم بعد النشر
- إنشاء طلب من Customer Web والتأكد من ظهور `booking_number` ومصدر الطلب `web`.
- إنشاء طلب من Mobile والتأكد من ظهور `booking_number` ومصدر الطلب `mobile`.
- فتح الطلب من Admin والتأكد من ظهور سجل الأحداث.
- تغيير الحالة والدفع وتعيين خبيرة والتأكد من تسجيل الأحداث.
