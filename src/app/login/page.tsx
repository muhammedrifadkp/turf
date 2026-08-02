'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTurf } from '@/lib/store/context';
import { Lock, Mail, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, users } = useTurf();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = login(email, password);
    if (res.success && res.user) {
      if (res.user.role === 'staff') {
        router.push('/drinks');
      } else {
        router.push('/schedule');
      }
    } else {
      setError(res.error || 'Invalid credentials or account is disabled.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 text-slate-900">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-emerald-600 text-white text-3xl flex items-center justify-center font-black mx-auto shadow-md">
            ⚽
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Turf Management System
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Enter your credentials to access owner & staff dashboard
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-extrabold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Email / Username *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username (e.g. admin or staff)"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 font-bold rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 font-bold rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide shadow-md transition-all flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>SIGN IN TO DASHBOARD</span>
          </button>
        </form>
      </div>
    </div>
  );
}
