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

      {/* Customer Directory List / Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">No customer profiles found.</div>
        ) : (
          <>
            {/* Mobile View Customer Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredCustomers.map((c) => (
                <div
                  key={c.phone}
                  className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 text-base leading-tight">
                        {c.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-bold mt-0.5">
                        {c.team_name}
                      </p>
                    </div>

                    <a
                      href={`tel:${c.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center space-x-1 transition-colors shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{c.phone}</span>
                    </a>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-500">Total Visits:</span>
                      <span className="font-bold text-amber-700">{c.total_visits} Visits</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-500">Last Played:</span>
                      <span className="font-semibold text-slate-900">{formatNiceDate(c.last_played)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-500">Avg Spend / Visit:</span>
                      <span className="font-semibold text-slate-900">{formatINR(c.avg_spend_per_visit)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="font-semibold text-slate-500">Lifetime Spend:</span>
                      <span className="font-black text-emerald-700 text-sm">{formatINR(c.total_spent)}</span>
                    </div>
                    {c.outstanding_amount > 0 && (
                      <div className="flex items-center justify-between pt-1 text-rose-600 font-black">
                        <span>Outstanding Due:</span>
                        <span>{formatINR(c.outstanding_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
          </>
        )}
      </div>
    </div>
  );
}
