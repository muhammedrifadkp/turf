'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTurf } from '@/lib/store/context';
import { Calendar, Clock, Coffee, Settings, UserPlus, Zap } from 'lucide-react';

export default function MobileNavBar() {
  const pathname = usePathname();
  const { user, role, currentShift } = useTurf();

  if (!user || pathname === '/login') return null;

  // Streamlined mobile navigation items
  const navItems =
    role === 'staff'
      ? [
          { href: '/drinks', label: 'Drinks POS', icon: Coffee },
          { href: '/shift', label: currentShift ? 'Active Shift' : 'Shift', icon: Zap },
        ]
      : [
          { href: '/schedule', label: 'Schedule', icon: Calendar },
          { href: '/bookings', label: 'Bookings', icon: Clock },
          { href: '/staff', label: 'Staff', icon: UserPlus },
          { href: '/settings', label: 'Settings', icon: Settings },
        ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-700 font-extrabold bg-emerald-50'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight mt-0.5 font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
