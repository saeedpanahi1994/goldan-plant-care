import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goldan.plantcare',
  appName: 'Goldan Plant Care',
  webDir: 'build',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
