import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The app ships with its own copy of the web build (the `out` folder), so it
 * opens without a connection and is a real app in the eyes of the app stores.
 * Build it with `npm run build:android` or `npm run build:ios`.
 *
 * Development only: to load the app from a dev server instead (live reload),
 * set CAP_SERVER_URL before syncing, for example
 *   CAP_SERVER_URL=http://192.168.1.20:3000 npx cap sync
 * Never set it for a store build.
 */
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.ansrdlabs.wakaguard',
  appName: 'WakaGuard',
  webDir: 'out',
  // Identifies the app to outside services such as map tile servers, which
  // may refuse requests from an anonymous WebView
  appendUserAgent: 'WakaGuard',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith('http://'),
        },
      }
    : {}),
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
    // Only needed when loading from a plain-http dev server
    allowMixedContent: !!devServerUrl && devServerUrl.startsWith('http://'),
    // Stops background location updates halting after 5 minutes
    useLegacyBridge: true,
  },
};

export default config;
