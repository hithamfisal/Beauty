# Beauty Home Service - Renamed Project

تم تعديل هوية المشروع إلى **Beauty Home Service**.

## المسار المقترح

```powershell
D:\Dashboards Projects\Beauty\beauty_home_service
```

## أوامر التشغيل بعد النقل

### Backend
```powershell
cd "D:\Dashboards Projects\Beauty\beauty_home_service\backend"
yarn install
yarn dev
```

### Admin Dashboard
```powershell
cd "D:\Dashboards Projects\Beauty\beauty_home_service\admin-dashboard"
yarn install
yarn dev
```

### Mobile App
```powershell
cd "D:\Dashboards Projects\Beauty\beauty_home_service\mobile-app"
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" run --dart-define=API_BASE_URL=http://192.168.8.56:4000/api
```

> استبدل IP بعنوان جهازك الحقيقي.
