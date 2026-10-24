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
 *
 * Diagnosis only: a release build keeps the page's console out of the device
 * log. To see it while chasing a fault on a real phone, set CAP_DEVICE_LOGS=1
 * before syncing. Never set it for a store build either: the log can hold
 * positions and names.
 */
const devServerUrl = process.env.CAP_SERVER_URL;
const deviceLogs = process.env.CAP_DEVICE_LOGS === '1';

const config: CapacitorConfig = {
  appId: 'com.ansrdlabs.wakaguard',
  appName: 'WakaGuard',
  webDir: 'out',
  // Identifies the app to outside services such as map tile servers, which
  // may refuse requests from an anonymous WebView
  appendUserAgent: 'WakaGuard',
  ...(deviceLogs ? { loggingBehavior: 'production' as const } : {}),
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
    // Android 15+: light icons on the dark strip behind both system bars.
    // insetsHandling 'disable': MainActivity.java keeps the page clear of the bars
    // and the keyboard itself. From Capacitor 8.5 this plugin pads the window as
    // well, so the keyboard's height was taken off twice and the page shrank to a
    // strip above a dark gap whenever someone typed (seen on build 25, 23 October)
    SystemBars: {
      style: 'DARK',
      insetsHandling: 'disable',
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
    // Sign in with Google and Apple (src/lib/socialSignIn.ts): the phone signs
    // in with the provider and hands its token to the web layer, which signs in
    // to Firebase as it does for email and password
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
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
