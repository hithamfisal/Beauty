# Beauty Home Service v2.2 + v2.3

## v2.2 - Beautician Availability & Smart Assignment

تمت إضافة إدارة توفر وتغطية خبيرات التجميل، وتشمل:

- حالة توفر الخبيرة: متاحة / مشغولة / موقوفة.
- أيام العمل.
- ساعات العمل.
- الحد الأقصى للطلبات اليومية.
- المدن والأحياء التي تغطيها الخبيرة.
- ترشيح ذكي للخبيرات المناسبة للطلب حسب:
  - الخدمة المطلوبة.
  - المدينة والحي.
  - التاريخ والوقت.
  - حالة التوفر.
  - عدد الطلبات اليومية.
  - التقييم وعدد نماذج الأعمال.

### Backend APIs

- `GET /api/admin/bookings/:id/smart-beauticians`
- `GET /api/admin/beauticians/:id/availability`
- `PATCH /api/admin/beauticians/:id/availability`

## v2.3 - Customer Accounts & OTP

تمت إضافة حساب العميلة برقم الجوال، ويشمل:

- طلب رمز تحقق OTP.
- تأكيد الرمز وتسجيل الدخول.
- عرض طلبات العميلة من الحساب.
- إدارة العناوين المحفوظة.
- حفظ الخبيرات المفضلات API-ready.

> في بيئة التطوير يكون OTP الافتراضي `1234`. في الإنتاج يتم توليد رمز عشوائي، ويحتاج لاحقاً إلى ربط SMS/WhatsApp للإرسال الفعلي.

### Backend APIs

- `POST /api/customer/auth/request-otp`
- `POST /api/customer/auth/verify-otp`
- `GET /api/customer/me`
- `GET /api/customer/my-bookings`
- `GET /api/customer/addresses`
- `POST /api/customer/addresses`
- `DELETE /api/customer/addresses/:id`
- `GET /api/customer/favorites`
- `POST /api/customer/favorites/:beauticianId`
- `DELETE /api/customer/favorites/:beauticianId`

## Admin Dashboard

تمت إضافة قسم:

- توفر وتغطية خبيرات التجميل.
- زر ترشيح في جدول الطلبات لعرض الخبيرات الأنسب.

## Customer Web

تمت إضافة تبويب:

- حسابي.
- تسجيل الدخول برقم الجوال و OTP.
- طلباتي.
- العناوين المحفوظة.

## التشغيل

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

Customer Web:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\customer-web"
npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
npm run dev
```

بعد الاختبار المحلي، يتم رفع النسخة إلى GitHub ثم إعادة نشر Backend أولاً وبعده Admin وCustomer Web.
