# v5.2 SaaS Tenant Management & Onboarding

## الهدف
تحويل إدارة شركات SaaS إلى تدفق عملي واضح من لوحة Super Admin، مع إنشاء حساب دخول مستقل لكل شركة لمديرها، وتنظيف المشروع من بقايا Yarn والاعتماد على npm فقط.

## ما تم تنفيذه

### 1. إنشاء شركة + حساب مديرها من نفس النموذج
من صفحة:

`مدير النظام > الشركات والاشتراكات`

يستطيع Super Admin إدخال:

- اسم الشركة
- الرابط المختصر slug
- اسم مدير الشركة
- بريد مدير الشركة
- كلمة مرور مدير الشركة
- الباقة
- حالة الشركة
- حالة التهيئة
- بيانات الهوية الأساسية مثل الشعار والألوان والواتساب

بعد الحفظ، يتم إنشاء:

- Tenant جديد
- حساب `tenant_owner` مرتبط بهذه الشركة
- رابط حجز خاص بالشركة
- سجل Audit Log للعملية

### 2. إدارة إعدادات العميل من Super Admin
يمكن للـ Super Admin فتح أي شركة من جدول الشركات والقيام بـ:

- تعديل بيانات الشركة الأساسية
- تعديل الشعار وصورة الغلاف والألوان
- تعديل الباقة وحالة الاشتراك
- تعديل حالة الشركة: active / inactive / suspended
- تعديل حالة التهيئة: pending_setup / ready / needs_review
- إضافة أو تحديث حساب مدير الشركة

### 3. حسابات مدير الشركة
كل شركة يجب أن يكون لها حساب مدير مرتبط بـ `tenant_id`.

مثال:

- `sa@beauty.local` = Super Admin، بدون tenant_id
- `admin@beauty.local` = مدير شركة Beauty Home Service، مرتبط بـ tenant_id
- `admin@rasheeda.local` = مدير شركة Rasheeda، مرتبط بـ tenant_id

مدير الشركة يرى فقط بيانات شركته:

- الحجوزات
- الخدمات
- الأقسام
- الخبيرات
- المدن والأحياء
- هوية الشركة

### 4. Audit Log
تمت إضافة جدول `audit_logs` لتسجيل عمليات Super Admin المهمة مثل:

- إنشاء شركة
- تعديل شركة
- إنشاء أو تحديث مدير شركة

### 5. تنظيف Yarn والاعتماد على npm
تم حذف وإزالة بقايا Yarn:

- حذف `.yarnrc`
- عدم وجود `yarn.lock`
- تعديل أوامر Vercel إلى `npm run build`
- تعديل ملفات التوثيق من yarn إلى npm

الأوامر المعتمدة الآن:

```powershell
npm install
npm run dev
npm run build
npm run migrate
```

## Migration جديد

يجب تشغيل:

```text
backend/database/migrations/008_saas_tenant_onboarding.sql
```

عن طريق:

```powershell
cd backend
npm run migrate
```

## APIs الجديدة

```text
GET  /api/super-admin/tenants/:id
POST /api/super-admin/tenants/:id/admin-users
PATCH /api/super-admin/tenants/:id/admin-users/:userId
GET  /api/super-admin/audit-logs
```

## ملاحظات تشغيل

بعد إنشاء شركة ومديرها، يدخل مدير الشركة من نفس صفحة تسجيل دخول الإدارة باستخدام بريده وكلمة مروره.

الـ Backend سيضع داخل JWT:

- tenant_id
- tenant_slug
- role

وبذلك تظهر له بيانات شركته فقط.

## الاختبار المنفذ

- Backend syntax check: ناجح
- Admin Dashboard build: ناجح
- Customer Web build: ناجح

لم يتم تشغيل migration فعلياً داخل هذه البيئة لعدم توفر قاعدة PostgreSQL محلية هنا. يجب تشغيله على جهازك المحلي وعلى Supabase.
