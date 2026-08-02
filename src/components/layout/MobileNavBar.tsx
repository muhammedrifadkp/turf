'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTurf } from '@/lib/store/context';
import {
  Calendar,
  Clock,
  Settings,
  UserPlus,
} from 'lucide-react';

export default function MobileNavBar() {
  const pathname = usePathname();
  const { user, role, currentShift } = useTurf();

  if (!user || pathname === '/login') return null;

  // Admin / Owner navigation items
  const adminNavItems = [
    { href: '/schedule', label: 'Schedule Timeline', icon: Calendar },
    { href: '/bookings', label: 'Bookings Directory', icon: Clock },
    { href: '/staff', label: 'Staff Assignment', icon: UserPlus },
    { href: '/settings', label: 'Facility Settings', icon: Settings },
  ];

  // Staff navigation items
  const staffNavItems = [
    { href: '/drinks', label: 'Drinks POS', emoji: '🥛' },
    { href: '/shift', label: currentShift ? 'Active Shift' : 'Shift', emoji: '⚡' },
  ];

  const itemsToRender = role === 'owner' ? adminNavItems : staffNavItems;

  return (
    <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-3 py-2 flex items-center justify-between z-50 h-16 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
      <div
        className={`w-full max-w-md mx-auto ${
          role === 'owner' ? 'grid grid-cols-4 gap-1' : 'flex items-center justify-around px-4'
        }`}
      >
        {itemsToRender.map((item: any) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1 transition-all ${
                isActive
                  ? 'text-[#00a67e] font-extrabold scale-105'
                  : 'text-slate-400 hover:text-slate-600 font-bold'
              }`}
            >
              {Icon ? (
                <Icon className={`w-5 h-5 stroke-[2.2] ${isActive ? 'text-[#00a67e]' : 'text-slate-400'}`} />
              ) : (
                <span className="text-xl leading-none">{item.emoji}</span>
              )}
              <span
                className={`text-[9px] sm:text-[10px] font-bold leading-tight text-center truncate max-w-full ${
                  isActive ? 'text-[#00a67e]' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </footer>
  );
}
