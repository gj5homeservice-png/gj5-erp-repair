# GJ5 HOME SERVICE | Enterprise ERP

Professional Service & Repair Management System for Desktop and Mobile.

## Desktop Build Instructions (Windows EXE)

### Prerequisites
- [Node.js (v18+)](https://nodejs.org/)
- Windows OS (to build .exe)

### 1. Installation
```bash
npm install
```

### 2. Development
Run the Next.js server and Electron shell separately:
- **Terminal 1**: `npm run dev`
- **Terminal 2**: `npm run electron`

### 3. Build Standalone EXE
To create a portable Windows executable:
```bash
npm run dist
```
Find the output in the `dist/` folder.

## Features
- **Professional Service Registry**: Track repair jobs and visits.
- **Enterprise CRM**: Manage leads and follow-ups.
- **Invoicing Hub**: Professional PDF generation and billing.
- **Inventory System**: QR/Barcode scanning and stock movement.
- **HRMS & Kiosk**: Biometric-style attendance and payroll.
- **Firebase Auth**: Secure Google Sign-in protection.
- **P&L Analytics**: Real-time financial surveillance.
- **Local Persistence**: Works offline, data saved on your machine.
