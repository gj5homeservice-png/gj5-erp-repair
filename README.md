# GJ5 HOME SERVICE | Enterprise ERP

Professional Service & Repair Management System for Desktop and Mobile.

## Mobile Build Instructions (Android APK)

Follow these steps to generate your production-ready Android APK.

### Prerequisites
- [Node.js (v18+)](https://nodejs.org/)
- [Android Studio](https://developer.android.com/studio)
- [Capacitor CLI](https://capacitorjs.com/docs/getting-started)

### 1. Build and Sync
Run this command in your project root to generate the static files and sync with the Android project:
```bash
npm run mobile:build
```

### 2. Generate APK via Android Studio
Run this command to open the project in **Android Studio**:
```bash
npm run mobile:open
```
Inside Android Studio:
1. Wait for the **Gradle Sync** to finish (status bar at the bottom).
2. Navigate to the top menu: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Once the build is complete, a popup will appear in the bottom right corner. Click **"Locate"** to find your `app-debug.apk`.

---

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

---

## Core Features
- **Biometric Smart Attendance**: Selfie + GPS verified shift logging.
- **Enterprise CRM**: Manage leads and conversion funnels.
- **Invoicing Hub**: GST compliant billing and A4 PDF generation.
- **Inventory System**: Barcode tracking and stock movements.
- **Workforce Management**: QR Identity Cards and automated payroll.
- **Firebase Security**: Cloud-synced data with local persistence.
