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

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TurfArena - Commercial Turf Management SaaS',
  description:
    'Mobile-first minimal sports turf management system for daily bookings, shift accounting, drinks POS, expenses & owner reports.',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
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
          <NetworkMonitorModal />
          <ConfirmProvider>
            <AuthGuard>
              <div className="flex flex-col min-h-screen">
                <Sidebar />
                <Header />
                <div className="lg:pl-64 flex-1 flex flex-col w-full">
                  <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
