param(
  [string]$ApiBaseUrl = "https://beauty-backend-taupe.vercel.app/api"
)

$ErrorActionPreference = "Stop"

Write-Host "Building Arabic Beauty Home Service release artifacts..." -ForegroundColor Cyan
Write-Host "API_BASE_URL = $ApiBaseUrl" -ForegroundColor Yellow

if (!(Test-Path ".\android\key.properties")) {
  Write-Host "WARNING: android\key.properties not found. Release will not be signed with your production upload key." -ForegroundColor Yellow
  Write-Host "Create it before Google Play upload. See README_ANDROID_RELEASE_SIGNING.md" -ForegroundColor Yellow
}

& "D:\flutter\bin\flutter.bat" clean
& "D:\flutter\bin\flutter.bat" pub get
& "D:\flutter\bin\flutter.bat" build appbundle --release --dart-define=API_BASE_URL=$ApiBaseUrl
& "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=$ApiBaseUrl

Write-Host "AAB:" -ForegroundColor Green
Write-Host "build\app\outputs\bundle\release\app-release.aab"
Write-Host "APK:" -ForegroundColor Green
Write-Host "build\app\outputs\flutter-apk\app-release.apk"
