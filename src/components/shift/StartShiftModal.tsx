'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { usePopup } from '@/components/ui/ConfirmModal';
import { Clock, DollarSign, ShieldAlert, Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function StartShiftModal({ isOpen, onClose }: Props) {
  const { alert } = usePopup();
  const { user, startShift, currentShift } = useTurf();
  const [openingCash, setOpeningCash] = useState<number | string>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await startShift(Number(openingCash) || 0);
      onClose();
    } catch (err) {
      alert('Failed to start shift. Please try again.', 'Shift Error', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative text-slate-900 animate-slide-up sm:animate-fade-in">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">Start New Staff Shift</h3>
              <p className="text-xs text-slate-500">Initialize accounting session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentShift ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-4 text-amber-800 text-xs">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Shift Already Active</span>
            </div>
            <p>You already have an active shift started by {currentShift.staff_name}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Staff On Duty
              </label>
              <p className="text-sm font-black text-emerald-700">{user?.full_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">Role: {user?.role}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Opening Cash In Register (₹)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="Enter initial drawer cash..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-slate-900 rounded-xl pl-9 pr-4 py-3 text-base font-bold outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Optional initial floating cash in the counter drawer.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wide shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Starting Shift...' : 'START SHIFT NOW'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
