'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTurf } from '@/lib/store/context';
import {
  Calendar,
  Clock,
  Coffee,
  DollarSign,
  FileText,
  LogOut,
  Settings,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import StartShiftModal from '@/components/shift/StartShiftModal';

export default function Sidebar() {
  const pathname = usePathname();
  const {
    user,
    role,
    users,
    switchUser,
    logout,
    currentShift,
    syncStatus,
    pendingOfflineCount,
    triggerManualSync,
    settings,
  } = useTurf();

  const [mounted, setMounted] = useState(false);
  const [showStartShift, setShowStartShift] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user || pathname === '/login') return null;

  // Role-based Navigation links: Streamlined for Owner & Staff
  const navLinks =
    role === 'staff'
      ? [
          { href: '/drinks', label: 'Drinks POS & Counter', icon: Coffee },
          { href: '/shift', label: 'Active Shift & Cash', icon: Zap },
        ]
      : [
          { href: '/schedule', label: 'Schedule Timeline', icon: Calendar },
          { href: '/bookings', label: 'Bookings Directory', icon: Clock },
          { href: '/staff', label: 'Staff Assignment', icon: UserPlus },
          { href: '/settings', label: 'Facility Settings', icon: Settings },
        ];

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200 shadow-sm z-40 text-slate-900 justify-between">
        {/* Top Section: Brand Logo & Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto p-4 space-y-5">
          {/* Logo & Facility Header */}
          <Link href={role === 'staff' ? '/drinks' : '/schedule'} className="flex items-center space-x-3 px-2 py-1 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              ⚽
            </div>
            <div className="overflow-hidden">
              <span className="font-black text-base tracking-tight text-slate-900 block leading-tight truncate">
                {settings.facility_name.split(' ')[0]} <span className="text-emerald-600">{settings.facility_name.split(' ')[1] || 'Turf'}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                {role === 'staff' ? 'Duty Staff Counter' : 'Owner Admin SaaS'}
              </span>
            </div>
          </Link>

          {/* Active Shift Widget */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider">Shift Accounting</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  currentShift ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                }`}
              />
            </div>

            {currentShift ? (
              <Link
                href="/shift"
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center space-x-2"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>ACTIVE SHIFT VIEW</span>
              </Link>
            ) : (
              <button
                suppressHydrationWarning
                onClick={() => setShowStartShift(true)}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center space-x-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>START NEW SHIFT</span>
              </button>
            )}
          </div>

          {/* Navigation Links List */}
          <nav className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-2">
              {role === 'staff' ? 'Staff Duty Controls' : 'Main Operations'}
            </p>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Profile & Network Sync */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
          {/* Supabase Live Realtime Badge */}
          <button
            suppressHydrationWarning
            onClick={triggerManualSync}
            title="Supabase Live Realtime Connection"
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              syncStatus === 'synced'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : syncStatus === 'failed'
                ? 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {syncStatus === 'failed' ? (
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="capitalize text-[11px] font-extrabold">
                {syncStatus === 'synced' ? 'Supabase Live' : syncStatus === 'syncing' ? 'Syncing...' : 'Disconnected'}
              </span>
            </div>
          </button>

          {/* Production User Profile Card with Direct Log Out */}
          <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left overflow-hidden">
                <span className="block text-xs font-black text-slate-900 leading-tight truncate">
                  {user.full_name}
                </span>
                <span
                  className={`text-[9px] font-black uppercase tracking-wider ${
                    role === 'owner' ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {role === 'owner' ? '👑 Owner' : '👤 Duty Staff'}
                </span>
              </div>
            </div>

            <button
              suppressHydrationWarning
              onClick={logout}
              title="Log Out of System"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Start Shift Modal */}
      {showStartShift && (
        <StartShiftModal isOpen={showStartShift} onClose={() => setShowStartShift(false)} />
      )}
    </>
  );
}
