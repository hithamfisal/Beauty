# v5.1 Tenant Public Access + Branding

تم تنفيذ هذه المرحلة فوق v5.0 SaaS Foundation بهدف جعل كل شركة SaaS لها رابط حجز عام وهوية مستقلة وخدمات وحجوزات معزولة حسب `tenant_id`.

## ما تم إضافته

### Backend
- إضافة Migration جديد:
  - `backend/database/migrations/007_tenant_branding_public_access.sql`
- إضافة حقول هوية الشركة في جدول `tenants`:
  - `logo_url`
  - `cover_image_url`
  - `tagline_ar`
  - `description_ar`
  - `primary_color`
  - `secondary_color`
  - `accent_color`
  - `whatsapp_number`
  - `support_phone`
  - `support_email`
  - `public_booking_enabled`
- إضافة API عام لجلب هوية الشركة:
  - `GET /api/tenant`
  - `GET /api/public/tenant`
  - `GET /api/public/tenants/:slug`
- إضافة API لإعدادات الشركة من لوحة الإدارة:
  - `GET /api/admin/tenant`
  - `PATCH /api/admin/tenant`
- توسيع APIs الـ Super Admin لإضافة وتعديل بيانات الهوية عند إنشاء أو تعديل شركة.

### Customer Web
- قراءة `tenant slug` من الرابط:
  - `https://app.domain.com/beauty-home-service`
  - `https://app.domain.com/rasheeda-beauty-center`
  - أو `?tenant=rasheeda-beauty-center`
- إرسال `x-tenant-slug` مع كل طلب API.
- عرض اسم الشركة، الشعار، الشعار النصي، الوصف، صورة الغلاف، والألوان الخاصة بالشركة.
- الخدمات، الأقسام، المدن، الخبيرات، والحجوزات تعمل حسب الشركة المحددة بالـ slug.

### Admin Dashboard
- إضافة صفحة: `مدير النظام > هوية الشركة`.
- تمكين مدير الشركة من تعديل:
  - اسم الشركة
  - شعار الشركة
  - صورة الغلاف
  - الشعار النصي
  - وصف الشركة
  - الألوان
  - واتساب وبريد الدعم
- توسيع صفحة Super Admin لإضافة بيانات الهوية عند إنشاء شركة.
- عرض رابط الحجز الخاص بكل شركة في جدول الشركات.

### Mobile Apps
- إضافة `TENANT_SLUG` كـ dart-define لتطبيق العميلة وتطبيق المدير.
- كل طلب API من الجوال يرسل `x-tenant-slug`.

## طريقة استخدام روابط الشركات

مثال:

```text
https://app.yourdomain.com/beauty-home-service
https://app.yourdomain.com/rasheeda-beauty-center
```

أو أثناء التطوير:

```text
http://localhost:5173/beauty-home-service
http://localhost:5173/rasheeda-beauty-center
```

## بناء APK لشركة محددة

تطبيق العميلة:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api --dart-define=TENANT_SLUG=beauty-home-service
```

تطبيق المدير:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-mobile-app"
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api --dart-define=TENANT_SLUG=beauty-home-service
```

لشركة Rasheeda:

```powershell
--dart-define=TENANT_SLUG=rasheeda-beauty-center
```

## تحديث قاعدة البيانات

بعد تنزيل هذه النسخة، من مجلد backend:

```powershell
npm run migrate
```

أو من Supabase SQL Editor شغل الملف:

```text
backend/database/migrations/007_tenant_branding_public_access.sql
```

## ملاحظات مهمة

- لا تزال هذه المرحلة بدون دفع إلكتروني أو فواتير اشتراك.
- العزل يعتمد على `tenant_id` الذي تم تأسيسه في v5.0.
- عند فتح رابط شركة غير نشطة، يظهر خطأ أن الشركة غير متاحة.
- في الإنتاج يجب ضبط Nginx أو الاستضافة بحيث أي مسار مثل `/rasheeda-beauty-center` يرجع إلى `customer-web/index.html`.
