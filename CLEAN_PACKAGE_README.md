# Clean Source Package

هذه نسخة مصدر نظيفة لا تحتوي على:

- node_modules
- dist
- build
- .dart_tool
- backups
- logs
- yarn files

مدير الحزم المعتمد في الويب والـ backend هو npm فقط.

## بعد فك الضغط

```powershell
cd backend
npm install
npm run migrate
npm run dev
```

```powershell
cd customer-web
npm install
npm run build
```

```powershell
cd admin-dashboard
npm install
npm run build
```

```powershell
cd mobile-app
D:\flutter\bin\flutter.bat pub get
```

```powershell
cd admin-mobile-app
D:\flutter\bin\flutter.bat pub get
```
