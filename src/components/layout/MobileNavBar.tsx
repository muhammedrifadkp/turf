'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTurf } from '@/lib/store/context';
import {
  Banknote,
  Calendar,
  Clock,
  Coffee,
  FileText,
  GlassWater,
  Grid,
  MoreHorizontal,
  Settings,
  UserPlus,
  Users,
  Zap,
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileNavBar() {
  const pathname = usePathname();
  const { user, role, currentShift, settings, logout } = useTurf();
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  if (!user || pathname === '/login') return null;

  // Primary 2 mobile navigation items matching code.html reference
  const primaryNavItems = [
    { href: '/drinks', label: 'Drinks POS', emoji: '🥛' },
    { href: '/shift', label: currentShift ? 'Active Shift' : 'Shift', emoji: '⚡' },
  ];

  // All routes for the "More" slide-up drawer
  const allRoutes = [
    { href: '/schedule', label: 'Schedule Timeline', description: 'Bookings calendar & slots', icon: Calendar, color: 'bg-emerald-500' },
    { href: '/bookings', label: 'Bookings Directory', description: 'Search & manage reservations', icon: Clock, color: 'bg-blue-500' },
    { href: '/drinks', label: 'Drinks POS & Counter', description: 'Quick beverage sales', icon: GlassWater, color: 'bg-emerald-600' },
    { href: '/customers', label: 'Customer CRM', description: 'Player directory & stats', icon: Users, color: 'bg-purple-500' },
    { href: '/monthly', label: 'Monthly Subscriptions', description: 'Fixed slot memberships', icon: Zap, color: 'bg-indigo-500' },
  ];

  if (role === 'owner') {
    allRoutes.push(
      { href: '/staff', label: 'Staff Assignment', description: 'Staff shifts & access', icon: UserPlus, color: 'bg-teal-500' },
      { href: '/reports', label: 'Reports & Analytics', description: 'Revenue & shift accounting', icon: FileText, color: 'bg-cyan-500' },
      { href: '/settings', label: 'Facility Settings', description: 'Turf rates & configuration', icon: Settings, color: 'bg-slate-700' }
    );
  }

  const isMoreActive = !primaryNavItems.some((item) => item.href === pathname);

  return (
    <>
      {/* Mobile Fixed Bottom Navigation Bar matching page-single-bookings code.html reference */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between z-50 h-16 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className={`flex items-center w-full max-w-md mx-auto ${role === 'staff' ? 'justify-around px-4' : 'justify-between'}`}>
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMoreDrawer(false)}
                className={`flex flex-col items-center gap-0.5 p-2 transition-all ${
                  isActive ? 'text-[#00a67e] font-extrabold scale-105' : 'text-slate-400 hover:text-slate-600 font-bold'
                }`}
              >
                <span className="text-xl leading-none">{item.emoji}</span>
                <span className={`text-[10px] font-bold leading-none ${isActive ? 'text-[#00a67e]' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Green "N" More Button (Owner only) */}
          {role === 'owner' && (
            <button
              onClick={() => setShowMoreDrawer(!showMoreDrawer)}
              className={`bg-[#00a67e] hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-1.5 rounded-2xl shadow-md flex flex-col items-center justify-center transition-all cursor-pointer min-w-[50px] h-[44px] ${
                showMoreDrawer || isMoreActive ? 'ring-2 ring-emerald-600 ring-offset-1' : ''
              }`}
            >
              <span className="font-black text-sm leading-none">N</span>
              <span className="text-[8px] font-black uppercase tracking-wider leading-none mt-0.5">More</span>
            </button>
          )}
        </div>
      </footer>

      {/* "More" Slide-up Mobile Navigation Drawer */}
      <AnimatePresence>
        {showMoreDrawer && (
          <div className="lg:hidden fixed inset-0 z-50 overflow-hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreDrawer(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col w-full overflow-hidden border-t border-slate-200 pb-safe"
            >
              {/* Drag handle & Header */}
              <div className="p-4 pb-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#00a67e] flex items-center justify-center text-white font-black text-lg shadow-sm">
                    ⚽
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-tight">
                      {settings?.facility_name || 'Orion Turf'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {role === 'owner' ? 'Owner Navigation' : 'Staff Navigation'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowMoreDrawer(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Grid List */}
              <div className="p-4 overflow-y-auto space-y-2 max-h-[60vh]">
                <div className="grid grid-cols-1 gap-2">
                  {allRoutes.map((route) => {
                    const Icon = route.icon;
                    const isActive = pathname === route.href;

                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        onClick={() => setShowMoreDrawer(false)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                          isActive
                            ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className={`w-10 h-10 rounded-xl ${route.color} text-white flex items-center justify-center shadow-sm shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">
                              {route.label}
                            </span>
                            <span className="text-[10px] text-slate-500 leading-tight">
                              {route.description}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </Link>
                    );
                  })}
                </div>

                {/* User & Role Quick Info inside Drawer */}
                <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                      {user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900 leading-tight">{user?.full_name}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{role}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      setShowMoreDrawer(false);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center space-x-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
