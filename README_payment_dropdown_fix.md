# Beauty Home Service - Payment Dropdown Fix

تمت إضافة قائمة منسدلة منفصلة لتغيير حالة الدفع مباشرة من جدول الطلبات.

## التغييرات

- إضافة Dropdown في عمود **الدفع** داخل جدول الطلبات.
- إضافة Dropdown لحالة الدفع داخل نافذة تفاصيل الطلب.
- إضافة Backend endpoint:
  - `PATCH /api/admin/bookings/:id/payment`
- القيم المدعومة:
  - `unpaid` = غير مدفوع
  - `deposit_paid` = عربون مدفوع
  - `paid` = مدفوع بالكامل
  - `refunded` = مسترجع

## بعد الاستبدال

شغل Backend و Admin ثم اختبر تغيير حالة الدفع من جدول الطلبات.
