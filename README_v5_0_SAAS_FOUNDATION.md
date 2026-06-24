# v5.0 SaaS Foundation

تم تحويل المشروع إلى أساس SaaS متعدد الشركات مع الحفاظ على تشغيل النسخة الحالية كشركة افتراضية باسم **Beauty Home Service**.

## ما تم تنفيذه

- إضافة جدول `tenants` لإدارة الشركات/العملاء التجاريين.
- إضافة `tenant_id` للجداول التشغيلية الأساسية مثل الحجوزات، العملاء، الخدمات، الأقسام، الخبيرات، المدن، الأحياء، سجل الحالات، القوالب، التنبيهات، ومعرض الأعمال.
- إنشاء Tenant افتراضي: `beauty-home-service` وربط البيانات الحالية به.
- إضافة جداول باقات الاشتراك الأساسية `subscription_plans` وجداول استخدام أولية.
- تجهيز عزل البيانات على مستوى قاعدة البيانات باستخدام PostgreSQL Row Level Security للجداول ذات `tenant_id`.
- تعديل backend ليستخدم سياق Tenant تلقائياً من `x-tenant-slug` أو `x-tenant-id` أو `DEFAULT_TENANT_SLUG`.
- تعديل JWT للمدير ليحمل `tenant_id` و `tenant_slug`.
- حساب المدير الحالي أصبح `tenant_owner` للشركة الافتراضية.
- إضافة حساب Super Admin اختياري من متغيرات البيئة.
- إضافة APIs للـ Super Admin:
  - `GET /api/super-admin/tenants`
  - `POST /api/super-admin/tenants`
  - `PATCH /api/super-admin/tenants/:id`
  - `GET /api/super-admin/plans`
- إضافة صفحة مبدئية في Admin Dashboard باسم: **الشركات والاشتراكات**.

## متغيرات البيئة الجديدة

```env
DEFAULT_TENANT_SLUG=beauty-home-service
SUPER_ADMIN_EMAIL=owner@example.com
SUPER_ADMIN_PASSWORD=replace-with-a-very-strong-super-admin-password
```

`SUPER_ADMIN_EMAIL` و `SUPER_ADMIN_PASSWORD` اختياريان، لكن يلزمان لإدارة كل الشركات من صفحة SaaS.

## طريقة عمل العزل

كل طلب API يعمل داخل سياق Tenant. إذا لم يتم إرسال Tenant، يستخدم النظام:

```text
DEFAULT_TENANT_SLUG=beauty-home-service
```

لذلك ستظل تطبيقات العميلة والمدير الحالية تعمل كما هي على الشركة الافتراضية.

للتعامل مع شركة مختلفة لاحقاً يمكن إرسال Header:

```http
x-tenant-slug: salon-riyadh
```

أو:

```http
x-tenant-id: <tenant_uuid>
```

## ملاحظات مهمة

- لم تتم إضافة الدفع الإلكتروني أو الفواتير في هذه المرحلة.
- لم تتم إضافة صفحة تسجيل الشركات العامة بعد.
- لم يتم تفعيل Custom Branding الكامل لكل شركة بعد.
- هذه المرحلة هي الأساس الآمن قبل الاشتراكات والدفع.

## الاختبارات المنفذة

- فحص Syntax للـ backend بنجاح.
- بناء `customer-web` بنجاح.
- بناء `admin-dashboard` بنجاح.

## المرحلة التالية المقترحة

### v5.1 Super Admin Dashboard

- تفاصيل الشركة.
- إنشاء مدير لكل شركة.
- تفعيل/إيقاف الشركة.
- تبديل الدخول لمعاينة شركة محددة.
- إحصائيات الاستخدام.

### v5.2 SaaS Plans & Limits

- حدود الحجوزات.
- حدود الخبيرات.
- حدود الخدمات.
- تفعيل/تعطيل الميزات حسب الباقة.
