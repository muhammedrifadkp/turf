import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TurfProvider } from '@/lib/store/context';
import { ConfirmProvider } from '@/components/ui/ConfirmModal';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavBar from '@/components/layout/MobileNavBar';
import AuthGuard from '@/components/auth/AuthGuard';
import NetworkMonitorModal from '@/components/network/NetworkMonitorModal';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Orion Turf - Commercial Turf Management SaaS',
  description:
    'Mobile-first minimal sports turf management system for daily bookings, shift accounting, drinks POS, expenses & owner reports.',
  applicationName: 'Orion Turf',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Orion Turf',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-emerald-500 selection:text-white`}
      >
        <TurfProvider>
          <ServiceWorkerRegister />
          <PwaInstallPrompt />
          <NetworkMonitorModal />
          <ConfirmProvider>
            <AuthGuard>
              <div className="flex flex-col min-h-screen">
                <Sidebar />
                <Header />
                <div className="lg:pl-64 flex-1 flex flex-col w-full">
                  <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 lg:pb-8">
                    {children}
                  </main>
                </div>
                <MobileNavBar />
              </div>
            </AuthGuard>
          </ConfirmProvider>
        </TurfProvider>
      </body>
    </html>
  );
}

