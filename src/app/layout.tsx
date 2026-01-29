import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WakaGuard - Road Safety',
  description: 'Community-driven road hazard reporting for safer travel across Nigeria',
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
    title: 'WakaGuard - Road Safety',
    description: 'Community-driven road hazard reporting for safer travel across Nigeria',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WakaGuard - Road Safety',
    description: 'Community-driven road hazard reporting for safer travel across Nigeria',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e2a4a',
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
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-48x48.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} min-h-screen bg-slate-50 dark:bg-dark-bg transition-colors`} suppressHydrationWarning>
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
