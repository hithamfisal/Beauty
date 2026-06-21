# Beauty Home Service v2.1 - Payments & Receipts

## الهدف
تطوير إدارة الدفع والتحصيل بعد v2.0، مع إضافة تفاصيل الدفع، إثبات الدفع، وسجل عمليات الدفع داخل لوحة الإدارة.

## الإضافات

### Backend / Database
- إضافة حقول جديدة إلى جدول `bookings`:
  - `payment_method`
  - `payment_reference`
  - `payment_proof_url`
  - `payment_notes`
  - `paid_at`
- إضافة جدول جديد:
  - `payment_records`
- إضافة API لتحديث تفاصيل الدفع:
  - `PATCH /api/admin/bookings/:id/payment-details`
- إضافة API لقراءة سجل الدفع:
  - `GET /api/admin/payments`
- تسجيل أحداث الدفع داخل `booking_events`.

### Admin Dashboard
- إضافة قسم جديد: **إدارة الدفع والتحصيل**.
- عرض الطلبات مع حالة الدفع وطريقة الدفع والمرجع والإيصال.
- زر **تعديل الدفع** من جدول الدفع ومن جدول الطلبات.
- عرض تفاصيل الدفع داخل نافذة تفاصيل الطلب.

## حالات الدفع
- `unpaid` = غير مدفوع
- `deposit_paid` = عربون مدفوع
- `paid` = مدفوع بالكامل
- `refunded` = مسترجع

## طرق الدفع المقترحة
- `cash` = كاش
- `bank_transfer` = تحويل بنكي
- `stc_pay` = STC Pay
- `mada` = مدى
- `card` = بطاقة
- `other` = أخرى

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

## النشر
بعد الرفع إلى GitHub، أعد نشر Backend أولاً حتى تُطبق تحديثات قاعدة البيانات، ثم أعد نشر Admin.
