# Beauty Home Service v2.5 - Admin Analytics Screen

## المنفذ

تمت إضافة شاشة جديدة داخل لوحة الإدارة باسم:

- **التحليلات**

داخل مجموعة:

- **معلومات التطبيق والقياسات**

## محتويات الشاشة

- كروت مؤشرات سريعة مشابهة للتصميم المرجعي:
  - إجمالي الإيرادات
  - حجوزات جديدة
  - المتخصصون النشطون
  - عملاء جدد
  - نسبة الإنجاز
  - طلبات غير مدفوعة

- رسم خطي لحجوزات آخر 12 شهر.
- توزيع حالات الطلبات.
- أداء الخدمات الأكثر طلباً.
- إيرادات الخدمات.
- المدن الأعلى طلباً.
- أداء الخبيرات.
- حالة التحصيل.
- جدول مؤشرات تشغيلية سريع.

## الملفات المعدلة

- `admin-dashboard/src/App.jsx`
- `admin-dashboard/src/style.css`

## ملاحظات

- الشاشة تعتمد على البيانات المحملة حالياً من الـ Backend:
  - `/api/admin/dashboard`
  - `/api/admin/bookings`
  - `/api/admin/catalog?all=1`
  - `/api/admin/beauticians`
  - `/api/admin/beautician-portfolio`
  - `/api/admin/beautician-reviews`

- لا تحتاج Backend endpoint جديد.
- لا تحتاج تعديل قاعدة البيانات.
- بعد الاستبدال يكفي تشغيل أو إعادة نشر Admin Dashboard فقط.

## التشغيل المحلي

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
npm run dev
```

## النشر

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1"

git add admin-dashboard/src/App.jsx admin-dashboard/src/style.css README_v2_5_admin_analytics.md
git commit -m "Add admin analytics dashboard screen"
git push origin main
```

ثم أعد نشر مشروع Admin Dashboard في Vercel.
