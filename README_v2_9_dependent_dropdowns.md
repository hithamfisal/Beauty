# Beauty Home Service v2.9 - Dependent Dropdown Filtering

## المنفذ

تم تأكيد وتوحيد سلوك القوائم المنسدلة المرتبطة في واجهة العميل ولوحة الإدارة:

- عند اختيار **قسم الخدمة** تظهر في قائمة **الخدمة** الخدمات التابعة لهذا القسم فقط.
- عند عدم اختيار قسم خدمة تظهر **كل الخدمات**.
- عند اختيار **المنطقة** تظهر في قائمة **المدينة** المدن التابعة لهذه المنطقة فقط.
- عند عدم اختيار منطقة تظهر **كل المدن**.
- عند اختيار **المدينة** تظهر في قائمة **الحي** الأحياء التابعة لهذه المدينة فقط.
- عند اختيار منطقة بدون مدينة تظهر الأحياء التابعة لمدن المنطقة فقط.
- عند عدم اختيار منطقة أو مدينة تظهر **كل الأحياء**.
- عند تغيير المنطقة يتم تفريغ المدينة والحي لمنع بقاء اختيار غير مرتبط.
- عند تغيير المدينة يتم تفريغ الحي.
- عند تغيير قسم الخدمة يتم تفريغ الخدمة المختارة.

## الملفات المعدلة

- `customer-web/src/main.jsx`
- `admin-dashboard/src/App.jsx`

## النشر

بعد الاستبدال:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1"

git add customer-web/src/main.jsx admin-dashboard/src/App.jsx README_v2_9_dependent_dropdowns.md
git commit -m "Apply dependent dropdown filtering for services and locations"
git push origin main
```

ثم أعد نشر:

1. Customer Web
2. Admin Dashboard

لا يحتاج Backend إلى تعديل لهذا الإصدار.
