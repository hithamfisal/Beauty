# Beauty Home Service v2.7 - Saudi Phone Mask

تم تطبيق قناع إدخال رقم الجوال في واجهات العميل والإدارة وتطبيق الجوال.

## الصيغة المعتمدة

```txt
05xxxxxxxx
```

- يبدأ الرقم بـ `05`.
- إجمالي الرقم 10 خانات.
- بعد `05` توجد 8 خانات رقمية فقط.

## الملفات المعدلة

- `customer-web/src/main.jsx`
- `admin-dashboard/src/App.jsx`
- `mobile-app/lib/main.dart`
- `backend/src/validation.js`
- `backend/src/server.js`

## الملاحظات

- واجهة العميل والإدارة تمنع إدخال أحرف غير رقمية.
- Backend يحوّل `9665xxxxxxxx` و `5xxxxxxxx` إلى `05xxxxxxxx` ثم يتحقق من الصيغة.
- يجب إعادة نشر Backend و Admin Dashboard و Customer Web، وبناء APK جديد إذا أردت تطبيق التغيير على الجوال.
