# Beauty Home Service v1.9 - Customer Web Portal

تمت إضافة واجهة عميلة تعمل على الكمبيوتر والمتصفح داخل مجلد جديد:

```txt
customer-web
```

## الوظائف

- الصفحة الرئيسية للعميلة.
- عرض أقسام الخدمات.
- عرض خبيرات التجميل.
- عرض معرض أعمال الخبيرات.
- صفحة طلب حجز من المتصفح.
- رفع صورة التصميم أثناء الطلب.
- اختيار خبيرة مفضلة.
- صفحة متابعة الطلب برقم الجوال.
- ربط كامل مع Backend الحالي عبر `VITE_API_BASE_URL`.

## تشغيل محلي

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\customer-web"
npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
npm run dev
```

## ملف البيئة المحلي

أنشئ ملف:

```txt
customer-web/.env
```

وضع فيه:

```env
VITE_API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

أو للتجربة على Backend محلي:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## نشر Vercel

أنشئ مشروع Vercel جديد من نفس GitHub repo:

```txt
Project Name: beauty-customer-web
Root Directory: customer-web
Framework Preset: Vite
Install Command: npm install --registry=https://registry.npmjs.org --fetch-timeout=900000
Build Command: npm run build
Output Directory: dist
```

Environment Variable:

```env
VITE_API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

## ملاحظات

- واجهة العميل لا تحتاج تسجيل دخول حالياً.
- المتابعة تتم برقم الجوال.
- رفع الصور يعتمد على endpoint الموجود في Backend: `/api/uploads/design-image`.
- في حال عدم إعداد Cloudinary، سيعمل النظام حسب منطق Backend الحالي للصور التجريبية.
