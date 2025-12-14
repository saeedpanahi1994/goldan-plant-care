# راهنمای ساخت APK برای اپلیکیشن گلدان

## مرحله 1: آماده‌سازی پروژه ✅ کامل
- نصب Capacitor: ✅ انجام شده
- تنظیمات اولیه: ✅ انجام شده
- ساخت پروژه اندروید: ✅ انجام شده
- بیلد React: ✅ انجام شده

## مرحله 2: راه‌های ساخت APK

### روش 1: Android Studio (توصیه شده)
1. دانلود و نصب Android Studio از: https://developer.android.com/studio
2. نصب Android SDK
3. اجرای دستور: `npx cap open android`
4. در Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)

### روش 2: Command Line (بدون Android Studio)
نیاز به نصب:
- Android SDK Command Line Tools
- Android Build Tools
- Android Platform Tools

### روش 3: GitHub Actions (خودکار)
ایجاد فایل `.github/workflows/build-apk.yml` برای بیلد خودکار

### روش 4: PWA (Progressive Web App) - فعلی
- اپ به صورت PWA آماده است
- قابل نصب روی موبایل از مرورگر
- کارکرد مشابه اپلیکیشن نیتیو

## فایل‌های ایجاد شده:
- `android/` - پروژه اندروید کامل
- `build/` - فایل‌های بیلد شده React
- `capacitor.config.ts` - تنظیمات Capacitor
- `public/manifest.json` - تنظیمات PWA

## مرحله بعدی:
برای ساخت APK نهایی، یکی از روش‌های بالا را انتخاب کنید.

## دسترسی به پروژه اندروید:
پوشه `android` حاوی پروژه کامل اندروید است که با هر ابزار سازگار با Android می‌توان آن را کامپایل کرد.