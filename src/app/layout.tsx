import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';
import { NativeSetup } from '@/components/NativeSetup';
import { ErrorReporting } from '@/components/ErrorReporting';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { IN_APP_SCRIPT } from '@/lib/frontPage';
import { APP_URL } from '@/lib/appUrl';

export const metadata: Metadata = {
  // Link previews need full addresses for their picture
  metadataBase: new URL(APP_URL),
  title: 'WakaGuard - Travel Safety',
  description: 'Start a trip before you travel. If you do not arrive, WakaGuard texts the people you chose with your last known location.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WakaGuard',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'WakaGuard',
    title: 'WakaGuard - Travel Safety',
    description: 'Start a trip before you travel. If you do not arrive, WakaGuard texts the people you chose with your last known location.',
    // The logo card shown when a trip link or the website is shared (build 25)
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'WakaGuard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WakaGuard - Travel Safety',
    description: 'Start a trip before you travel. If you do not arrive, WakaGuard texts the people you chose with your last known location.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#10231D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The script below may add an attribute to <html> before React starts
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: IN_APP_SCRIPT }} />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-48x48.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-dark-bg transition-colors" suppressHydrationWarning>
        <NativeSetup />
        <ErrorReporting />
        <ThemeProvider>
          <AuthProvider>
            <ServiceWorkerProvider>
              {children}
            </ServiceWorkerProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
