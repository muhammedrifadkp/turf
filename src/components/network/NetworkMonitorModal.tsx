'use client';

import React from 'react';
import { useTurf } from '@/lib/store/context';
import { WifiOff, RefreshCw, AlertTriangle, Database, Wifi } from 'lucide-react';

export default function NetworkMonitorModal() {
  const { isDisconnected, isCheckingConnection, reconnectError, checkConnection } = useTurf();

  if (!isDisconnected) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header / Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-6 py-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="mx-auto w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
            <WifiOff className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Application is not working due to network issues
          </h2>
          <p className="text-xs sm:text-sm text-rose-100 mt-1 font-medium">
            Database connection lost or internet unreachable
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 flex items-start space-x-3 text-rose-900 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-semibold mb-0.5 text-rose-950">Connection Interrupted</p>
              <p className="text-rose-800">
                Staff & Owner features require active access to the Supabase database. Please check your internet connection or network status.
              </p>
            </div>
          </div>

          {/* Connection Status Details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-700 font-medium">
                <Wifi className="w-4 h-4 text-slate-500" />
                <span>Internet Status:</span>
              </div>
              <span className="font-bold text-rose-600 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping mr-1"></span>
                Disconnected / Offline
              </span>
            </div>
            <div className="h-px bg-slate-200/70" />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-700 font-medium">
                <Database className="w-4 h-4 text-slate-500" />
                <span>Database (Supabase):</span>
              </div>
              <span className="font-bold text-amber-600">Unreachable</span>
            </div>
          </div>

          {/* Error Notice if reconnection attempt failed */}
          {reconnectError && (
            <div className="text-xs text-rose-600 font-medium text-center bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              {reconnectError}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1">
            <button
              onClick={() => checkConnection()}
              disabled={isCheckingConnection}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
            >
              <RefreshCw className={`w-5 h-5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
              <span>{isCheckingConnection ? 'Testing Connection...' : 'Refresh Connection'}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
          The application will automatically resume once connection to Supabase is restored.
        </div>
      </div>
    </div>
  );
}
