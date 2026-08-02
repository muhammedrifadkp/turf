'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTurf } from '@/lib/store/context';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useTurf();
  const [authReady, setAuthReady] = React.useState(isLoaded);

  useEffect(() => {
    if (isLoaded) {
      setAuthReady(true);
      return;
    }
    // Safety fallback: Never block user screen for more than 800ms
    const timer = setTimeout(() => {
      setAuthReady(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  const effectiveLoaded = isLoaded || authReady;

  useEffect(() => {
    if (!effectiveLoaded) return;

    // Public route: /login
    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      // Unauthenticated -> Redirect to /login
      router.push('/login');
    } else if (user && isLoginPage) {
      // Authenticated -> Redirect to default role dashboard
      if (user.role === 'staff') {
        router.push('/drinks');
      } else {
        router.push('/schedule');
      }
    } else if (user && user.role === 'staff') {
      // Staff role enforcement: Staff can access /drinks, /expenses, /shift, and booking POS details /bookings/[id]
      const isAllowedStaffRoute =
        pathname === '/drinks' ||
        pathname === '/expenses' ||
        pathname === '/shift' ||
        pathname.startsWith('/bookings/');
      if (!isAllowedStaffRoute) {
        router.push('/drinks');
      }
    }
  }, [user, effectiveLoaded, pathname, router]);

  // Loading Splash Screen while checking JWT authentication state
  if (!effectiveLoaded) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-black shadow-lg animate-pulse">
          ⚽
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-extrabold text-slate-900">Verifying Authentication Token...</p>
          <p className="text-xs text-slate-500">JWT Token Security & Session Verification</p>
        </div>
      </div>
    );
  }

  // If unauthenticated and on a protected page, hide content while redirecting
  if (!user && pathname !== '/login') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl font-bold">
          🔒
        </div>
        <p className="text-xs font-bold text-slate-600">Redirecting to Login Screen...</p>
      </div>
    );
  }

  return <>{children}</>;
}
