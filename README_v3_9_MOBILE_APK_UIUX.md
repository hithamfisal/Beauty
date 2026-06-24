# Beauty Home Service v3.9 — Mobile APK UI/UX Sync

تمت إضافة مرحلة v3.9 لتطبيق نفس الهوية البصرية الخاصة بـ Luxury Soft Beauty على تطبيق Flutter / Android APK.

## ما تم تنفيذه

- تطبيق ألوان Rose Gold / Ivory / Soft Pink / Cream Gold داخل Flutter.
- تحديث Theme العام للتطبيق.
- إضافة Bottom Navigation لتجربة أقرب لتطبيق جوال حقيقي.
- تحسين Home Screen ببطل ترحيبي، أزرار سريعة، أقسام، خدمات مقترحة، ونماذج أعمال.
- إضافة صفحة Categories / Services بتصميم بطاقات ناعمة.
- إضافة Service Details Screen مع زر حجز مباشر.
- إعادة تصميم Booking Flow كخطوات:
  1. بيانات العميلة
  2. الخدمة والموقع
  3. الموعد والخبيرة
  4. الملخص والملاحظات
- إضافة Booking Summary Sheet قبل إرسال الطلب.
- تحسين My Bookings Cards مع Status Pill و Timeline Status.
- تحسين Beauticians و Portfolio Cards.
- تحسين Account/Profile style.
- الإبقاء على نفس API endpoints والمنطق الحالي بدون تغيير Backend.

## الملفات المعدلة

```text
mobile-app/lib/main.dart
mobile-app/pubspec.yaml
README_v3_9_MOBILE_APK_UIUX.md
```

## بناء APK

من مجلد `mobile-app`:

```powershell
D:\flutter\bin\flutter.bat clean
D:\flutter\bin\flutter.bat pub get
D:\flutter\bin\flutter.bat build apk --release --dart-define=API_BASE_URL=http://YOUR_SERVER_IP:4000/api
```

للتجربة المباشرة على جهاز Android:

```powershell
D:\flutter\bin\flutter.bat run --dart-define=API_BASE_URL=http://YOUR_SERVER_IP:4000/api
```

استبدل `YOUR_SERVER_IP` بعنوان جهاز السيرفر أو الكمبيوتر الذي يعمل عليه Backend.

## ملاحظات

- لم تتم إضافة دفع إلكتروني أو تتبع مباشر أو OTP إنتاجي جديد في هذه المرحلة.
- تم تحسين شكل وتجربة التطبيق فقط وربطها بالوظائف الحالية.
- عند بناء APK فعلياً يجب التأكد من تشغيل Backend وإتاحة API للجوال على نفس الشبكة.
