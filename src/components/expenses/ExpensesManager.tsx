'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { usePopup } from '@/components/ui/ConfirmModal';
import { formatINR } from '@/lib/utils';
import { DollarSign, Edit2, Plus, Receipt, Sparkles, Trash2, Wallet, X } from 'lucide-react';
import { useConfirm } from '@/components/ui/ConfirmModal';
import AddExpenseModal from './AddExpenseModal';

export default function ExpensesManager() {
  const { alert } = usePopup();
  const confirm = useConfirm();
  const {
    expenses,
    addExpense,
    removeExpense,
    updateExpense,
    settings,
    currentShift,
    role,
    addCustomExpenseCategory,
  } = useTurf();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [category, setCategory] = useState(settings.expense_categories[0] || 'Miscellaneous');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gpay'>('cash');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !amount || Number(amount) <= 0) {
      alert('Please enter a valid description and positive expense amount.', 'Validation Error', 'warning');
      return;
    }

    addExpense(category, description, Number(amount), paymentMethod);
    setDescription('');
    setAmount('');
  };

  const handleDeleteExpense = async (exp: any) => {
    const isConfirmed = await confirm({
      title: 'Delete Expense Entry',
      message: `Are you sure you want to delete expense "${exp.description}" (${formatINR(exp.amount)})?`,
      confirmText: 'Delete Expense',
      variant: 'danger',
    });
    if (isConfirmed) {
      removeExpense(exp.id);
    }
  };

  const handleSaveEditedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    if (!editingExpense.description || !editingExpense.amount || Number(editingExpense.amount) <= 0) {
      alert('Please enter a valid description and positive expense amount.', 'Validation Error', 'warning');
      return;
    }

    updateExpense(editingExpense.id, {
      category: editingExpense.category,
      description: editingExpense.description,
      amount: Number(editingExpense.amount),
      payment_method: editingExpense.payment_method,
    });

    setEditingExpense(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryInput.trim()) {
      addCustomExpenseCategory(newCategoryInput.trim());
      setCategory(newCategoryInput.trim());
      setNewCategoryInput('');
      setShowAddCategory(false);
    }
  };

  // Date-based expense filtering: Staff sees today's working day date / current shift expenses only
  const shiftExpenses = expenses.filter((e) => {
    if (e.is_deleted) return false;

    const expDate = e.created_at ? e.created_at.split('T')[0] : '';
    if (role === 'staff') {
      // Staff view is strictly locked to current active shift OR today's working date
      const isCurrentShift = currentShift ? e.shift_id === currentShift.id : false;
      const isTodayDate = expDate === todayStr;
      return isCurrentShift || isTodayDate;
    }

    // Owner / Admin view allows date selector filtering
    if (selectedDate) {
      return expDate === selectedDate || (currentShift && e.shift_id === currentShift.id);
    }

    return true;
  });

  const totalShiftExpenses = shiftExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 text-2xl">
            💸
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Expense Tracker</h2>
            <p className="text-xs text-slate-500">
              Log operational facility expenses bound to shift accounting
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-md transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>ADD EXPENSE</span>
          </button>

          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-right">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Shift Total Expenses
              </span>
              <span className="text-lg font-black text-rose-600">
                {formatINR(totalShiftExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Standalone Quick Staff Expense Action Banner */}
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-rose-200" />
            <h3 className="text-base font-black tracking-tight">Staff Quick Expense Action</h3>
          </div>
          <p className="text-xs text-rose-100 font-medium">
            Easily record staff expenses anytime without tying to specific time slots or court bookings.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 active:scale-95 font-black text-xs sm:text-sm uppercase tracking-wide shadow-lg transition-all flex items-center justify-center space-x-2 self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 text-rose-600" />
          <span>ADD EXPENSE</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Expense Form Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Log New Expense</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Category
                </label>
                {role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    + Add Custom Category
                  </button>
                )}
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-slate-900 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
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

            {/* Custom Category Inline Form */}
            {showAddCategory && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase">
                  New Category Name
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="e.g. Generator Fuel"
                    className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-1.5 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description / Remarks *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Bought staff tea & biscuits"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-slate-900 rounded-xl px-3 py-2.5 text-xs outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-rose-600 font-black rounded-xl px-3 py-2.5 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'gpay')}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-slate-900 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="gpay">GPay</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wide shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>ADD EXPENSE ENTRY</span>
              </button>
            </div>
          </form>
        </div>

        {/* Expenses List Log */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-rose-600" />
              <span>
                {role === 'staff'
                  ? `Today's Working Date Expenses Log (${todayStr})`
                  : `Shift & Daily Expenses Log (${selectedDate})`}
              </span>
            </h3>
            {role === 'owner' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 outline-none focus:border-rose-600"
              />
            )}
          </div>

          {shiftExpenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">
              No expenses logged for current working day shift ({todayStr}).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3 rounded-l-xl">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Paid Via</th>
                    <th className="p-3">Logged By</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-center rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shiftExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-amber-800">{exp.category}</td>
                      <td className="p-3 text-slate-800">{exp.description}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase ${
                            exp.payment_method === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {exp.payment_method}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{exp.staff_name.split(' ')[0]}</td>
                      <td className="p-3 text-right font-black text-rose-600">
                        {formatINR(exp.amount)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setEditingExpense({ ...exp })}
                            title="Edit Expense"
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp)}
                            title="Delete Expense"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Standalone Quick Add Expense Modal */}
      <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                <span>Edit Expense Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-600 text-slate-900 font-bold rounded-xl px-3 py-2.5 text-xs outline-none"
                >
                  {settings.expense_categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-600 text-slate-900 font-bold rounded-xl px-3 py-2.5 text-xs outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-600 text-rose-600 font-black rounded-xl px-3 py-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={editingExpense.payment_method}
                    onChange={(e) =>
                      setEditingExpense({ ...editingExpense, payment_method: e.target.value as 'cash' | 'gpay' })
                    }
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-600 text-slate-900 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="gpay">GPay</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

