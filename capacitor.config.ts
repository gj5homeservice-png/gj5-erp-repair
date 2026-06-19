import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gj5.erp',
  appName: 'GJ5 HOME SERVICE',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true // Allows local API testing if needed
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
