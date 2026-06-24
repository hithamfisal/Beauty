# Beauty Home Service — Luxury UI/UX Redesign

تم تطبيق نظام تصميم موحد لمشروع Beauty Home Service ليغطي:

- لوحة Super Admin / SaaS
- لوحة Company Admin Web
- بوابة العميلة Customer Web
- تطبيق العميلة Flutter APK
- تطبيق مدير النظام Flutter APK

## الهوية البصرية

- Rose Gold: `#D4A08A`
- Soft Pink: `#F7DDE1`
- Ivory: `#FFF8F4`
- Cream Gold: `#F4E6D2`
- Soft Mocha: `#A78678`
- Rich Charcoal: `#292929`
- Warm White: `#FFFFFF`
- Light Border: `#EBD8D0`

## قواعد التنفيذ

- RTL عربي أولاً.
- الحفاظ على المنطق، الـ API calls، الـ routes، والـ database integration كما هي.
- التحسينات مركزة على الواجهة: ألوان، بطاقات، أزرار، جداول، نماذج، Badges، استجابة الموبايل، وتجربة SaaS فاخرة.
- استخدام CSS variables وFlutter Theme موحد لتسهيل التوسعة لاحقاً.

## الملفات المعدلة

- `admin-dashboard/src/style.css`
- `customer-web/src/style.css`
- `mobile-app/lib/main.dart`
- `admin-mobile-app/lib/main.dart`

## أوامر التشغيل

### Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev
npm run build
```

### Customer Web
```bash
cd customer-web
npm install
npm run dev
npm run build
```

### Customer Mobile APK
```bash
cd mobile-app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://YOUR_PC_IP:4000/api --dart-define=TENANT_SLUG=beauty-home-service
flutter build apk --release --dart-define=API_BASE_URL=https://YOUR_API_DOMAIN/api --dart-define=TENANT_SLUG=beauty-home-service
```

### Admin Mobile APK
```bash
cd admin-mobile-app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://YOUR_PC_IP:4000/api --dart-define=TENANT_SLUG=beauty-home-service
flutter build apk --release --dart-define=API_BASE_URL=https://YOUR_API_DOMAIN/api --dart-define=TENANT_SLUG=beauty-home-service
```
