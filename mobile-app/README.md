# Henna Customer Mobile App v1.2

تشغيل محلي على المحاكي:

```powershell
cd "D:\Dashboards Projects\Henna Application\henna_booking_mvp_v1\mobile-app"
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

تشغيل على جوال حقيقي داخل نفس شبكة الواي فاي:

```powershell
flutter run --dart-define=API_BASE_URL=http://YOUR_PC_IP:4000/api
```

بناء APK تجريبي:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=http://YOUR_PC_IP:4000/api
```

الملف الناتج:
`build\app\outputs\flutter-apk\app-release.apk`
