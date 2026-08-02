'use client';

import React, { useState, useMemo } from 'react';
import { useTurf } from '@/lib/store/context';
import { Customer } from '@/types';
import { formatINR, formatNiceDate } from '@/lib/utils';
import { Phone, Search, User, Users } from 'lucide-react';

export default function CustomerCRM() {
  const { bookings } = useTurf();
  const [searchQuery, setSearchQuery] = useState('');

  // Aggregate Customer Records dynamically from bookings
  const customerList = useMemo(() => {
    const map = new Map<string, Customer>();

    bookings.forEach((b) => {
      if (b.is_deleted || !b.phone) return;

      const existing = map.get(b.phone);

      const isPaidOrValid = b.status !== 'cancelled';
      const visitInc = isPaidOrValid ? 1 : 0;
      const spentInc = isPaidOrValid ? b.final_amount : 0;
      const outstandingInc = isPaidOrValid ? b.outstanding_balance || 0 : 0;

      if (!existing) {
        map.set(b.phone, {
          phone: b.phone,
          name: b.customer_name,
          team_name: b.team_name,
          total_visits: visitInc,
          last_played: b.play_date,
          total_spent: spentInc,
          outstanding_amount: outstandingInc,
          avg_spend_per_visit: spentInc,
          notes: b.notes,
        });
      } else {
        const newVisits = existing.total_visits + visitInc;
        const newSpent = existing.total_spent + spentInc;
        const newOutstanding = existing.outstanding_amount + outstandingInc;
        const lastDate =
          b.play_date > existing.last_played ? b.play_date : existing.last_played;

        map.set(b.phone, {
          ...existing,
          name: b.customer_name || existing.name,
          team_name: b.team_name || existing.team_name,
          total_visits: newVisits,
          last_played: lastDate,
          total_spent: newSpent,
          outstanding_amount: newOutstanding,
          avg_spend_per_visit: newVisits > 0 ? Math.round(newSpent / newVisits) : 0,
        });
      }
    });

    return Array.from(map.values());
  }, [bookings]);

  const filteredCustomers = useMemo(() => {
    return customerList.filter(
      (c) =>
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );
  }, [customerList, searchQuery]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 text-2xl">
            👥
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Customer History CRM</h2>
            <p className="text-xs text-slate-500">
              Track customer visit frequency, lifetime spend & outstanding balances
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Customer by Name, Team or Phone..."
            className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 rounded-xl pl-9 pr-4 py-2.5 outline-none"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">No customer profiles found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3 rounded-l-xl">Customer Name</th>
                  <th className="p-3">Team / Phone</th>
                  <th className="p-3">Total Visits</th>
                  <th className="p-3">Last Played</th>
                  <th className="p-3">Avg Spend</th>
                  <th className="p-3 text-right">Lifetime Spend</th>
                  <th className="p-3 text-right rounded-r-xl">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.phone} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-black text-slate-900 text-sm">{c.name}</td>
                    <td className="p-3 text-slate-600">
                      <div className="font-bold">{c.team_name}</div>
                      <div className="text-[11px] text-slate-400">{c.phone}</div>
                    </td>
                    <td className="p-3 font-bold text-amber-700">{c.total_visits} Visits</td>
                    <td className="p-3 text-slate-500">{formatNiceDate(c.last_played)}</td>
                    <td className="p-3 text-slate-700">{formatINR(c.avg_spend_per_visit)}</td>
                    <td className="p-3 text-right font-black text-emerald-700">
                      {formatINR(c.total_spent)}
                    </td>
                    <td className="p-3 text-right">
                      {c.outstanding_amount > 0 ? (
                        <span className="font-black text-rose-600 text-sm">
                          {formatINR(c.outstanding_amount)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Clear</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
