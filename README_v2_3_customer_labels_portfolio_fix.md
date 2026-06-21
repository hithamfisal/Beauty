# v2.3 Customer Arabic Labels + Portfolio / Beautician Selection Fix

## تم الإصلاح

- عرض حالات الطلب في واجهة العميل Web باللغة العربية.
- عرض حالة الدفع ومصدر الطلب باللغة العربية.
- إضافة labels عربية من Backend لطلبات العميل.
- تحسين قائمة اختيار الخبيرة للعميل: إذا لم توجد خبيرة مطابقة تماماً للخدمة/الموقع، يتم عرض الخبيرات المتاحات بدلاً من ترك القائمة فارغة.
- تحسين عرض نماذج الأعمال: إذا لم توجد نماذج مطابقة للخدمة، يتم عرض نماذج القسم، ثم المعرض العام كبديل.
- تحسين فلترة الخبيرات في Backend لتدعم المدن والأحياء المغطاة `coverage_city_ids` و `coverage_district_ids`.
- تحديث تطبيق الجوال بنفس منطق fallback للخبيرات ونماذج الأعمال.

## بعد الاستبدال

1. شغّل Backend محلياً أولاً:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
node src/server.js
```

2. شغّل Customer Web:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\customer-web"
npm run dev
```

3. اختبر:

- متابعة الطلب: الحالات تظهر بالعربي.
- إنشاء طلب: تظهر قائمة الخبيرات.
- اختيار خدمة: تظهر نماذج أعمال مرتبطة أو نماذج عامة عند عدم وجود مطابقة.

4. بعد نجاح الاختبار، ارفع إلى GitHub ثم أعد نشر Backend ثم Customer Web ثم Mobile APK عند الحاجة.
