# Beauty Home Service v1.1

## ما تم تنفيذه

### Backend
- إضافة مؤشرات تشغيلية في لوحة الإحصائيات: طلبات اليوم، طلبات بدون Beauty Home Service، طلبات غير مدفوعة.
- تحسين تعيين الBeauty Home Service مع تنبيه التعارض إذا كان للBeauty Home Service طلب آخر في نفس اليوم.
- إضافة API لتقويم الطلبات حسب التاريخ.
- إرجاع رقم جوال الBeauty Home Service داخل تفاصيل الطلب لاستخدامه في واتساب.

### Admin Dashboard
- إضافة بطاقات تشغيلية جديدة.
- إضافة تقويم الطلبات اليومي.
- إضافة أزرار واتساب للعميلة والBeauty Home Service داخل تفاصيل الطلب.
- إضافة تصدير CSV للطلبات المعروضة حسب الفلاتر.
- إضافة عرض وقت الحجز داخل جدول الطلبات.
- تحسين تنسيقات v1.1.

## التشغيل

شغل Backend:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
yarn install
yarn dev
```

شغل Admin Dashboard:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
yarn install
yarn dev
```

## الاختبار

1. افتح لوحة الإدارة.
2. أنشئ طلبين في نفس اليوم.
3. أضف Beauty Home Service.
4. عيّن نفس الBeauty Home Service للطلبين للتأكد من ظهور تنبيه التعارض.
5. افتح تفاصيل الطلب وجرب زر واتساب العميلة.
6. استخدم تقويم الطلبات لاختيار يوم الطلب.
7. جرّب زر تصدير CSV بعد استخدام الفلاتر.
