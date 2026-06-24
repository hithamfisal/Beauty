# Beauty Home Service v4.0 — Separate Admin Mobile App

تمت إضافة تطبيق جوال منفصل لمدير النظام داخل مجلد مستقل:

```text
admin-mobile-app
```

## الهدف

تطبيق APK مستقل للإدارة، منفصل تماماً عن تطبيق العميلة `mobile-app`.

## ما تم تنفيذه

- تطبيق Flutter مستقل باسم `beauty_home_service_admin_mobile`.
- Android package مستقل:

```text
com.beauty.homeservice.admin
```

- اسم التطبيق في Android:

```text
Beauty Admin
```

- شاشة دخول مدير النظام باستخدام نفس Backend endpoint:

```text
POST /api/admin/login
```

- واجهة Mobile Admin RTL بنفس هوية Luxury Soft Beauty.
- Bottom Navigation خاص بالإدارة:
  - الرئيسية
  - الحجوزات
  - الخدمات
  - الخبيرات
  - النظام

## الشاشات المضافة

### 1. Admin Login

- بريد المدير.
- كلمة المرور.
- حفظ جلسة المدير داخل Shared Preferences.

### 2. Overview

- كل الحجوزات.
- الطلبات الجديدة.
- طلبات اليوم.
- الطلبات بدون خبيرة.
- الحجوزات غير المدفوعة.
- الخبيرات الفعالات.
- أحدث طلبات تحتاج متابعة.

### 3. Bookings Management

- عرض الحجوزات في Cards مناسبة للجوال.
- بحث بالعميلة / رقم الحجز / الخدمة / المدينة.
- فلترة حسب الحالة.
- فتح تفاصيل الحجز.

### 4. Booking Details

- بيانات العميلة.
- بيانات الخدمة.
- الموقع.
- التاريخ والوقت.
- الحالة.
- الخبيرة المعينة.
- تحديث حالة الحجز.
- تعيين / إلغاء تعيين خبيرة.
- تحديث حالة الدفع.
- تعديل السعر المتوقع / النهائي / العربون.
- إضافة وتعديل ملاحظات الإدارة.
- عرض سجل الحالة والأحداث.

### 5. Services / Categories / Cities

- عرض ملخص الأقسام والخدمات والمناطق والمدن.
- عرض قوائم مختصرة مناسبة للجوال.

### 6. Artists

- عرض الخبيرات.
- البحث بالاسم / الجوال / المدينة / التخصص.
- عرض الحالة والتقييم والتخصص.

### 7. System Tools / Backup

- إنشاء نسخة احتياطية من المحلي.
- إنشاء نسخة احتياطية من Supabase.
- عرض آخر النسخ المحفوظة.
- عرض API Base URL.
- تسجيل خروج.

## بناء APK المدير

من مجلد المشروع:

```powershell
cd admin-mobile-app
D:\flutter\bin\flutter.bat clean
D:\flutter\bin\flutter.bat pub get
D:\flutter\bin\flutter.bat build apk --release --dart-define=API_BASE_URL=http://YOUR_SERVER_IP:4000/api
```

## تشغيل مباشر على الجوال

```powershell
cd admin-mobile-app
D:\flutter\bin\flutter.bat run --dart-define=API_BASE_URL=http://YOUR_SERVER_IP:4000/api
```

استبدل:

```text
YOUR_SERVER_IP
```

بعنوان الجهاز الذي يشغل Backend.

## ملاحظات مهمة

- هذا التطبيق منفصل عن تطبيق العميلة.
- لا يغير منطق Backend.
- يعتمد على نفس حساب المدير الموجود في `.env`:

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

- لتثبيت تطبيق العميلة وتطبيق المدير على نفس الجهاز، تم تغيير `applicationId` لتطبيق المدير إلى قيمة مستقلة.
