import type { CapacitorConfig } from '@capacitor/cli';

const capServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.ansrdlabs.wakaguard',
  appName: 'WakaGuard',
  webDir: 'out',
  server: capServerUrl
    ? {
        url: capServerUrl,
        cleartext: true,
      }
    : {
        // Load from Firebase Hosting for proper Firebase Auth support on iOS
        url: 'https://routepulse-5701f.web.app',
        cleartext: false,
      },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#1e293b',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e293b',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    backgroundColor: '#1e293b',
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#1e293b',
    // Stops background location updates halting after 5 minutes
    useLegacyBridge: true,
    allowMixedContent: true,
  },
};

export default config;
