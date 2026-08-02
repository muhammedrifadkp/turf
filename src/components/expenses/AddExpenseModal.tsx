'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { usePopup } from '@/components/ui/ConfirmModal';
import { DollarSign, Plus, Receipt, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddExpenseModal({ isOpen, onClose }: Props) {
  const { alert } = usePopup();
  const { addExpense, settings } = useTurf();

  const [amount, setAmount] = useState<number | string>('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gpay'>('cash');
  const [category, setCategory] = useState<string>('Miscellaneous');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid expense amount greater than 0.', 'Validation Error', 'warning');
      return;
    }

    if (!note.trim()) {
      alert('Please enter a note / description for this expense.', 'Validation Error', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      addExpense(category || 'Miscellaneous', note.trim(), numAmount, paymentMethod);
      
      // Reset form & close
      setAmount('');
      setNote('');
      onClose();
    } catch (err) {
      alert('Failed to add expense. Please try again.', 'Error', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl relative text-slate-900 space-y-4 animate-slide-up sm:animate-fade-in">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
              💸
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Add Expense
              </h3>
              <p className="text-xs text-slate-500 font-medium">Quick staff expense logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Expense Amount */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Expense Amount (₹) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-black text-sm">
                ₹
              </div>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter expense amount (e.g. 150)"
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-2xl pl-9 pr-4 py-3 text-base font-black outline-none transition-all"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Field 2: Note */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Note *
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter note or expense description (e.g., Snacks for staff, Ground cleaning supplies)"
              className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 text-xs sm:text-sm font-semibold rounded-2xl px-3.5 py-2.5 outline-none transition-all resize-none"
              required
            />
          </div>

          {/* Optional Category & Payment Mode selection */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
              >
                {Array.from(
                  new Set(['Drinks', ...(settings.expense_categories || []), 'Miscellaneous'])
                ).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'gpay')}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
              >
                <option value="cash">Cash</option>
                <option value="gpay">GPay</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Expense...' : 'SAVE EXPENSE'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
