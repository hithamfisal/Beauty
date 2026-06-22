# Beauty Home Service - Android Release Signing & Google Play Internal Testing

This package prepares the Flutter Android app for a production-style signed release and Google Play Internal Testing.

## 1. Create the upload keystore

Run this from PowerShell:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"

keytool -genkeypair -v `
  -keystore "android\app\upload-keystore.jks" `
  -storetype JKS `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias beauty_upload
```

If `keytool` is not recognized, use Android Studio JBR keytool, for example:

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v `
  -keystore "android\app\upload-keystore.jks" `
  -storetype JKS `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias beauty_upload
```

Use strong passwords and keep them safe. Losing this keystore can block future updates if Play App Signing is not configured correctly.

## 2. Create key.properties

Copy:

```text
mobile-app/android/key.properties.example
```

to:

```text
mobile-app/android/key.properties
```

Then set the same passwords you used when generating the keystore:

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=beauty_upload
storeFile=app/upload-keystore.jks
```

Do not upload `key.properties` or `upload-keystore.jks` to GitHub.

## 3. Build AAB and APK

For Google Play Internal Testing, build AAB:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"

& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build appbundle --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

Output:

```text
mobile-app/build/app/outputs/bundle/release/app-release.aab
```

For direct APK testing:

```powershell
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://beauty-backend-taupe.vercel.app/api
```

Output:

```text
mobile-app/build/app/outputs/flutter-apk/app-release.apk
```

Or use the helper script:

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1\mobile-app"
.\tools\build_release.ps1 -ApiBaseUrl "https://beauty-backend-taupe.vercel.app/api"
```

## 4. Google Play Internal Testing

1. Open Google Play Console.
2. Create a new app.
3. Package name must match:

```text
com.beauty.homeservice
```

4. Complete app access, ads, content rating, target audience, data safety, and privacy declarations.
5. Go to Testing > Internal testing.
6. Create a release.
7. Upload:

```text
app-release.aab
```

8. Add tester emails.
9. Publish the internal test release.
10. Send the opt-in link to testers.

## 5. Versioning

Current mobile version in `pubspec.yaml`:

```yaml
version: 2.3.0+23
```

For every new Google Play upload, increase the number after `+`:

```yaml
version: 2.3.1+24
```

## 6. Important security note

Keep these files private:

```text
mobile-app/android/key.properties
mobile-app/android/app/upload-keystore.jks
```

They are already added to `.gitignore` in this package.
