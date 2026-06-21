# Beauty Home Service v1.4

## التغييرات الرئيسية

- إضافة هيكلة المواقع: المنطقة > المدينة > الحي.
- إضافة أقسام الخدمات: قسم الخدمة > الخدمة.
- إضافة تعديل وإضافة وحذف للمناطق والمدن والأحياء وأقسام الخدمات والخدمات.
- تغيير مسمى الحنانات إلى خبيرات التجميل في الواجهة والتطبيق.
- إضافة الخبرة الأساسية لخبيرة التجميل من قائمة الخدمات.
- تحديث تطبيق الجوال ليستخدم المنطقة والمدينة والحي وقسم الخدمة والخدمة.

## استيراد بيانات المواقع

تم دعم طريقتين للاستيراد:

### 1) استيراد بيانات السعودية الجاهزة من GitHub

هذا الخيار لا يحتاج مفتاح SPL ويستخدم كمصدر تجريبي مؤقت إلى حين تفعيل المفتاح الرسمي.

المصدر:

```txt
homaily/Saudi-Arabia-Regions-Cities-and-Districts
```

Endpoint:

```txt
POST /api/admin/import/saudi-open-data
```

Body:

```json
{
  "mode": "all"
}
```

القيم المدعومة:

```txt
regions | cities | districts | all
```

من لوحة الإدارة استخدم زر:

```txt
استيراد بيانات السعودية الجاهزة من GitHub
```

ملاحظة: هذا المصدر مفتوح ويجب مراجعته قانونياً قبل الاعتماد التجاري النهائي. الخيار الرسمي يبقى SPL National Address API.

### 2) استيراد من SPL National Address API

Endpoint:

```txt
POST /api/admin/import/spl
```

Body:

```json
{
  "api_key": "SPL_API_KEY",
  "mode": "regions | cities | districts | all",
  "region_id": "optional-for-cities",
  "city_id": "required-for-districts"
}
```

## متغيرات البيئة المطلوبة

Backend:

```env
DATABASE_URL=...
JWT_SECRET=...
SPL_API_KEY=... # اختياري فقط عند استخدام SPL الرسمي
```

Admin:

```env
VITE_API_BASE_URL=https://YOUR-BACKEND.vercel.app/api
```

## طريقة التشغيل المحلي

Backend:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
yarn install
yarn dev
```

Admin:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
yarn install
yarn dev
```

Mobile:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" run --dart-define=API_BASE_URL=http://192.168.8.56:4000/api
```

## طريقة استخدام الاستيراد من GitHub

1. شغل Backend.
2. شغل Admin Dashboard.
3. افتح لوحة الإدارة.
4. من قسم "استيراد بيانات المواقع" اضغط "استيراد بيانات السعودية الجاهزة من GitHub".
5. انتظر حتى تظهر رسالة بعدد المناطق والمدن والأحياء المستوردة.
6. جرّب نموذج الطلب واختر المنطقة ثم المدينة ثم الحي.


## تحديث استيراد بيانات السعودية - v1.4 Fix

تم تعديل الاستيراد ليستخدم كمصدر أساسي مستودع `yasseralsamman/saudi-national-address` لأنه يوفر بيانات المناطق والمدن والأحياء بصيغة JSON Lite وبترخيص بيانات CC0، مع إبقاء مستودع `homaily/Saudi-Arabia-Regions-Cities-and-Districts` كخيار احتياطي.

زر **استيراد بيانات السعودية الجاهزة من GitHub** يجب أن يعيد ملخصاً يحتوي على أعداد المناطق والمدن والأحياء. الأعداد المتوقعة تقريباً:

- المناطق: 13
- المدن: 4581 تقريباً
- الأحياء: 3732 تقريباً

بعد الاستيراد، افتح قسم المواقع وستظهر القوائم المتسلسلة: المنطقة ← المدينة ← الحي.

## تحديث فلترة المواقع بعد الاستيراد

تم تعديل سلوك قوائم المواقع كالتالي:

- إذا لم يتم اختيار منطقة، تظهر كل المدن.
- إذا تم اختيار منطقة، تظهر مدن هذه المنطقة فقط.
- إذا لم يتم اختيار مدينة، تظهر كل الأحياء.
- إذا تم اختيار مدينة، تظهر أحياء هذه المدينة فقط.
- تم تطبيق السلوك في لوحة الإدارة وتطبيق الجوال.

