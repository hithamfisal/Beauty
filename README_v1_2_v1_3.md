# Beauty Home Service v1.2 + v1.3 Update

## v1.2
- تطبيق عميلة Flutter مرتبط بالـ Backend.
- جلب المدن والخدمات من قاعدة البيانات.
- إرسال طلب حجز من الجوال.
- صفحة طلباتي حسب رقم الجوال.
- OTP تجريبي محلي عبر الكود 1234.
- endpoint تجريبي لرفع صورة تصميم كـ data URL.

## v1.3
- إدارة توفر الحنانات.
- تسجيل تقييم داخلي للBeauty Home Service بعد الطلب.
- تحسين ملف الBeauty Home Service داخل Backend بإحصائيات الطلبات والتقييم.
- إضافة APIs لملف الBeauty Home Service والتوفر والتقييم.
- إضافة واجهة في لوحة الإدارة لإضافة توفر وتقييمات.

## تشغيل Backend
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\backend"
yarn install
yarn dev
```

## تشغيل Admin
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-dashboard"
yarn install
yarn dev
```

## تشغيل Mobile App على Android Emulator
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

## تشغيل Mobile App على جوال حقيقي في نفس Wi-Fi
استخرج IP الكمبيوتر:
```powershell
ipconfig
```
ثم:
```powershell
flutter run --dart-define=API_BASE_URL=http://YOUR_PC_IP:4000/api
```

## بناء APK
```powershell
flutter build apk --release --dart-define=API_BASE_URL=http://YOUR_PC_IP:4000/api
```
