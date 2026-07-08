import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fif.broadcast',
  appName: 'FIF Broadcast',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
