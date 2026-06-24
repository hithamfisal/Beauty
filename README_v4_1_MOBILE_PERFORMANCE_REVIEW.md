# Beauty Home Service v4.1 - Mobile Performance Review

## الهدف
مراجعة أداء تطبيقات الجوال وتحسين سرعة التنقل والتحميل في جميع الأقسام الأساسية بدون تغيير منطق العمل.

## النطاق
- `mobile-app` تطبيق العميلة.
- `admin-mobile-app` تطبيق مدير النظام.
- `backend` تحسين محدود لدعم الأداء في شاشة حجوزات المدير.

## التحسينات المنفذة

### 1. تحسين استدعاءات API
- إضافة `http.Client` مشترك بدلاً من إنشاء اتصال جديد لكل طلب.
- إضافة `timeout` للطلبات حتى لا تبقى الواجهة معلقة عند بطء الشبكة.
- إضافة ذاكرة مؤقتة قصيرة `in-memory cache` لطلبات GET المتكررة.
- تفريغ الكاش تلقائياً عند عمليات `POST/PATCH/DELETE` حتى لا تظهر بيانات قديمة بعد التعديل.

### 2. تحسين القوائم الطويلة
- تحويل أهم القوائم الثقيلة من `ListView` مع `children` و `map` إلى `ListView.builder`.
- تحسين شاشة خدمات العميلة.
- تحسين شاشة الخبيرات في تطبيق العميلة.
- تحسين شاشة طلباتي في تطبيق العميلة.
- تحسين شاشة حجوزات المدير.
- تحسين شاشة الخبيرات في تطبيق المدير.

### 3. تحسين الصور
- إضافة مكون `OptimizedNetworkImage` في تطبيق العميلة.
- استخدام `cacheWidth/cacheHeight` لتقليل استهلاك الذاكرة عند عرض صور نماذج الأعمال.
- تقليل جودة الفلترة `FilterQuality.low` للصور الصغيرة داخل الكروت.
- استبدال صور الخبيرات داخل القوائم بأيقونة خفيفة لتقليل التقطيع عند التمرير.

### 4. تحسين Dashboard المدير
- شاشة Overview لم تعد تجلب كل الحجوزات؛ أصبحت تجلب آخر 6 حجوزات فقط.
- شاشة الحجوزات في تطبيق المدير أصبحت تجلب أول 120 حجز فقط كبداية بدلاً من كامل قاعدة البيانات.
- تم دعم `limit` و `offset` في API الخاص بحجوزات المدير.

### 5. تحسين التنقل والرندر
- إضافة `pageTransitionsTheme` موحد وخفيف.
- الحفاظ على `IndexedStack` حتى لا تعاد تهيئة التبويبات عند الانتقال بينها.
- تقليل بناء العناصر غير الظاهرة داخل القوائم الطويلة.

## الملفات المعدلة
- `mobile-app/lib/main.dart`
- `admin-mobile-app/lib/main.dart`
- `backend/src/server.js`

## ملاحظات مهمة
- لم يتم تغيير قاعدة البيانات.
- لم يتم تغيير تصميم الهوية البصرية.
- لم يتم حذف أي شاشة أو وظيفة.
- التحسين الحالي يركز على تجربة الجوال والتمرير والتحميل.

## أوامر البناء المقترحة

### تطبيق العميلة
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

### تطبيق مدير النظام
```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\admin-mobile-app"
& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

## توصيات إضافية للمرحلة التالية
- إضافة Pagination حقيقي في شاشة الحجوزات مع زر تحميل المزيد.
- إضافة Debounce للبحث في شاشة حجوزات المدير.
- ضغط الصور أو استخدام CDN للصور مستقبلاً.
- تجنب رفع صور كبيرة الحجم داخل الخدمات والخبيرات.
- قياس الأداء فعلياً من Android Studio Profiler بعد تثبيت APK على جهاز حقيقي.
