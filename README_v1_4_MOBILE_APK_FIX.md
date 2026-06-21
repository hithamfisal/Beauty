# v1.4 Mobile APK Fix

تم إصلاح مشكلة ظهور `FormatException: Unexpected character / The page could not be found` داخل تطبيق الجوال.

## التعديلات
- توحيد بناء روابط API لمنع ظهور `//` داخل الرابط.
- معالجة استجابات السيرفر غير JSON برسالة واضحة.
- إضافة fallback في تطبيق الجوال: إذا لم يعمل `/customer/catalog` يتم تحميل القوائم من `/regions`, `/cities`, `/districts`, `/service-categories`, `/services`.
- إضافة صلاحية الإنترنت في AndroidManifest إذا لم تكن موجودة.

## بناء APK محلي
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=http://192.168.8.56:4000/api
```

## مهم
تأكد أن Backend يعمل وأن الرابط التالي يرجع JSON:
`http://192.168.8.56:4000/api/health`
