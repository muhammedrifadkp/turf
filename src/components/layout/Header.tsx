'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  User,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import StartShiftModal from '@/components/shift/StartShiftModal';

export default function Header() {
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = useMemo(() => {
    const base = [
      { href: '/schedule', label: 'Schedule', icon: Calendar },
      { href: '/bookings', label: 'Bookings', icon: Clock },
      { href: '/drinks', label: 'Drinks', icon: Coffee },
      { href: '/expenses', label: 'Expenses', icon: DollarSign },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/monthly', label: 'Monthly Subs', icon: Zap },
    ];

    if (role === 'owner') {
      base.push({ href: '/staff', label: 'Staff Assignment', icon: UserPlus });
      base.push({ href: '/reports', label: 'Reports & Analytics', icon: FileText });
      base.push({ href: '/settings', label: 'Settings', icon: Settings });
    }

    return base;
  }, [role]);

  if (!mounted || !user || pathname === '/login') return null;

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Facility Name */}
            <div className="flex items-center space-x-3">
              <Link href="/schedule" className="flex items-center space-x-2 group">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                  ⚽
                </div>
                <div>
                  <span className="font-extrabold text-lg tracking-tight text-slate-900 block leading-none">
                    {settings.facility_name.split(' ')[0]}
                    <span className="text-emerald-600">Turf</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
                    Management SaaS
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            {user && pathname !== '/login' && (
              <nav className="hidden lg:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Right Status Actions & User Role Switcher */}
            {user && pathname !== '/login' && (
              <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Supabase Live Realtime Status Badge */}
              <button
                suppressHydrationWarning
                onClick={triggerManualSync}
                title="Supabase Live Realtime Connection"
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : syncStatus === 'failed'
                    ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                {syncStatus === 'failed' ? (
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span className="capitalize hidden sm:inline">
                  {syncStatus === 'synced' ? 'Supabase Live' : syncStatus === 'syncing' ? 'Syncing...' : 'Disconnected'}
                </span>
              </button>

              {/* Shift Quick Status Button */}
              {currentShift ? (
                <Link
                  href="/shift"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition-all"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>ACTIVE SHIFT</span>
                </Link>
              ) : (
                <button
                  suppressHydrationWarning
                  onClick={() => setShowStartShift(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>START SHIFT</span>
                </button>
              )}

              {/* User / Role Dropdown Selector */}
              <div className="relative">
                <button
                  suppressHydrationWarning
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-800 font-extrabold text-xs border border-slate-300">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block text-xs font-bold text-slate-900 leading-tight">
                      {user?.full_name?.split(' ')[0]}
                    </span>
                    <span
                      className={`text-[9px] font-black tracking-wider uppercase ${
                        role === 'owner' ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {role}
                    </span>
                  </div>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-400 font-medium">Logged in as</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{user?.full_name}</p>
                      <p className="text-xs text-emerald-600 font-semibold">{user?.email}</p>
                    </div>

                    <div className="px-3 py-2">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Switch Account / Role
                      </p>
                      {users.map((u) => (
                        <button
                          key={u.id}
                          suppressHydrationWarning
                          onClick={() => {
                            switchUser(u.id);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                            u.id === user?.id
                              ? 'bg-emerald-50 text-emerald-800 font-extrabold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{u.full_name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              u.role === 'owner'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        suppressHydrationWarning
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-slate-100 flex items-center space-x-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </header>

      {/* Start Shift Modal Popup */}
      {showStartShift && (
        <StartShiftModal isOpen={showStartShift} onClose={() => setShowStartShift(false)} />
      )}
    </>
  );
}
