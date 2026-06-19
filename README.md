# GJ5 HOME SERVICE | Enterprise ERP

Professional Service & Repair Management System for Desktop and Mobile.

## Mobile Build Instructions (Android APK)

### Prerequisites
- [Node.js (v18+)](https://nodejs.org/)
- [Android Studio](https://developer.android.com/studio)
- [Capacitor CLI](https://capacitorjs.com/docs/getting-started)

### 1. Build and Sync
Run these commands in your project root:
```bash
npm install
npm run mobile:sync
```

### 2. Generate APK
```bash
npm run mobile:open
```
- This will open the project in **Android Studio**.
- In Android Studio, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- The output APK will be in `android/app/build/outputs/apk/debug/app-debug.apk`.

## Desktop Build Instructions (Windows EXE)

### 1. Development
```bash
npm run dev
```

### 2. Build Standalone EXE (via Tauri)
```bash
npm run tauri:build
```
Find the output in the `src-tauri/target/release/bundle/` folder.

## Features
- **Biometric Smart Attendance**: Selfie + GPS verified shift logging.
- **Enterprise CRM**: Manage leads and follow-ups.
- **Invoicing Hub**: GST compliant billing and PDF generation.
- **Inventory System**: Barcode tracking and stock movements.
- **Workforce Management**: Employee QR identities and automated payroll.
- **Firebase Auth**: Secure Google Sign-in protection.
- **Local Persistence**: Works offline, data saved on your machine.
