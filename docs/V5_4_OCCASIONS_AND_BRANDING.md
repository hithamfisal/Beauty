# Beauty Home Service v5.4 — Occasion Types + Branding Browse Upload

## ما تم تنفيذه

### 1. نوع المناسبة أصبح قائمة منسدلة
- تم تحويل حقل **نوع المناسبة** في طلبات الحجز من حقل نصي إلى قائمة منسدلة.
- القائمة تظهر في:
  - Customer Web booking form.
  - Admin Dashboard create booking form.
  - Customer Flutter mobile booking form.
- القيم تأتي من قاعدة البيانات بدلاً من كونها ثابتة داخل الواجهة.

### 2. إدارة أنواع المناسبات من لوحة التحكم
- تمت إضافة صفحة جديدة في لوحة التحكم:
  - **إدارة الخدمات → أنواع المناسبات**
- يمكن من خلالها:
  - إضافة نوع مناسبة.
  - تعديل نوع مناسبة.
  - حذف نوع مناسبة.
  - ضبط الاسم العربي والإنجليزي والوصف والترتيب والحالة.
- تمت إضافة API جديد:
  - `GET /api/occasion-types`
  - `GET /api/admin/occasion-types?all=1`
  - `POST /api/admin/occasion-types`
  - `PATCH /api/admin/occasion-types/:id`
  - `DELETE /api/admin/occasion-types/:id`

### 3. قاعدة البيانات
- تمت إضافة Migration جديد:
  - `backend/database/migrations/009_occasion_types.sql`
- الجدول الجديد:
  - `occasion_types`
- يدعم Multi-Tenant عبر `tenant_id` و Row Level Security.
- تمت إضافة قيم افتراضية مثل:
  - زواج
  - خطوبة
  - ملكة
  - تخرج
  - عيد
  - جلسة تصوير
  - زيارة منزلية
  - مناسبة خاصة

### 4. هوية الشركة — رفع الشعار والخلفية من خلال استعراض
- في صفحة **هوية الشركة ورابط الحجز** تم تحسين حقول:
  - شعار الشركة.
  - خلفية صفحة الحجز.
- أصبح هناك:
  - معاينة للشعار/الخلفية.
  - زر **استعراض ورفع الشعار**.
  - زر **استعراض ورفع الخلفية**.
  - إمكانية لصق الرابط يدوياً كما كانت موجودة سابقاً.
- الرفع يستخدم endpoint الحالي:
  - `POST /api/admin/uploads/image`

## الملفات المعدلة

- `backend/src/server.js`
- `backend/database/migrations/009_occasion_types.sql`
- `admin-dashboard/src/App.jsx`
- `admin-dashboard/src/style.css`
- `customer-web/src/main.jsx`
- `mobile-app/lib/main.dart`
- `docs/V5_4_OCCASIONS_AND_BRANDING.md`

## التحقق

تم تنفيذ:

```bash
cd admin-dashboard
npm install
npm run build
```

ونجح البناء.

```bash
cd customer-web
npm install
npm run build
```

ونجح البناء.

```bash
cd backend
npm install
node --check src/server.js
```

ونجح فحص صياغة ملف الخادم.

> لم يتم تشغيل Flutter داخل بيئة العمل الحالية لأن Flutter SDK غير متاح هنا، لكن التعديل في Flutter محدود في تحويل حقل نوع المناسبة إلى Dropdown وربطه بـ `/api/occasion-types`.

## أوامر التشغيل بعد فك الضغط

```bash
cd backend
npm install
npm run migrate
npm run dev
```

```bash
cd admin-dashboard
npm install
npm run dev
npm run build
```

```bash
cd customer-web
npm install
npm run dev
npm run build
```

```bash
cd mobile-app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://YOUR_PC_IP:4000/api --dart-define=TENANT_SLUG=beauty-home-service
```
