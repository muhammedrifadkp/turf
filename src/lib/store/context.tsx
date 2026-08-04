'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  ActivityLog,
  Booking,
  BookingStatus,
  CourtType,
  DrinkSale,
  DrinkType,
  Expense,
  MonthlySubscription,
  PaymentRecord,
  Settings,
  Shift,
  ShiftSummary,
  SyncStatus,
  UserProfile,
  UserRole,
} from '@/types';
import { DEFAULT_SETTINGS, DRINK_ITEMS } from '@/lib/constants';
import { calculateDurationHours, calculateHourlyRate, generateUUID, getTodayDateString, normalizeBookingPaymentRecords } from '@/lib/utils';
import {
  generateJWTToken,
  getAuthToken,
  removeAuthToken,
  setAuthToken,
  verifyAndDecodeJWT,
} from '@/lib/auth/jwt';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

interface TurfContextType {
  // Auth & Roles
  user: UserProfile | null;
  role: UserRole;
  users: UserProfile[];
  switchUser: (userId: string) => void;
  login: (
    emailOrUsername: string,
    passwordInput?: string
  ) => { success: boolean; error?: string; user?: UserProfile };
  logout: () => void;
  createStaffAccount: (name: string, email: string, phone: string, password?: string) => void;
  resetStaffPassword: (userId: string, newPassword: string) => void;
  toggleUserStatus: (userId: string) => void;
  deleteStaffAccount: (userId: string) => void;

  // Shift System
  currentShift: Shift | null;
  shifts: Shift[];
  startShift: (openingCash: number) => Promise<Shift>;
  endShift: (shiftNotes?: string) => Promise<ShiftSummary>;
  reopenShift: (shiftId: string) => void; // Owner only

  // Bookings
  bookings: Booking[];
  addBooking: (
    bookingData: Omit<
      Booking,
      | 'id'
      | 'shift_id'
      | 'booking_date'
      | 'created_by_user_id'
      | 'created_by_name'
      | 'created_at'
      | 'updated_at'
      | 'final_amount'
      | 'outstanding_balance'
    >
  ) => Booking;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  collectPayment: (
    bookingId: string,
    cashAmount: number,
    gpayAmount: number,
    discount?: number
  ) => void;
  addPaymentRecord: (
    bookingId: string,
    amount: number,
    paymentMethod: 'cash' | 'gpay'
  ) => void;
  removePaymentRecord: (bookingId: string, recordId: string) => void;
  editPaymentRecord: (
    bookingId: string,
    recordId: string,
    newAmount: number,
    newPaymentMethod?: 'cash' | 'gpay'
  ) => void;
  cancelBooking: (
    bookingId: string,
    reason: string,
    refundAmount: number,
    cancellationCharge: number
  ) => void;
  softDeleteBooking: (bookingId: string) => void; // Owner only

  // Drinks Sales
  drinkSales: DrinkSale[];
  addDrinkSale: (
    drinkType: DrinkType,
    quantity: number,
    paymentMethod: 'cash' | 'gpay',
    bookingId?: string
  ) => void;
  removeDrinkSale: (drinkSaleId: string) => void;
  toggleDrinkPaidStatus: (drinkSaleId: string) => void;
  updateDrinkPaidMethod: (drinkSaleId: string, targetMethod: 'cash' | 'gpay') => void;

  // Expenses
  expenses: Expense[];
  addExpense: (
    category: string,
    description: string,
    amount: number,
    paymentMethod: 'cash' | 'gpay'
  ) => void;
  removeExpense: (expenseId: string) => void;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  addCustomExpenseCategory: (category: string) => void;

  // Subscriptions
  monthlySubscriptions: MonthlySubscription[];
  addSubscription: (sub: Omit<MonthlySubscription, 'id' | 'created_at'>) => void;
  toggleSubscriptionStatus: (id: string) => void;

  // Settings
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;

  // Activity Logs
  activityLogs: ActivityLog[];
  logAction: (
    action: string,
    entityType: ActivityLog['entity_type'],
    entityId?: string,
    prevVal?: string,
    newVal?: string
  ) => void;

  // Real-time Database Status & Connectivity
  syncStatus: SyncStatus;
  pendingOfflineCount: number;
  triggerManualSync: () => Promise<void>;
  isLoaded: boolean;

  // Network & Connection Monitoring
  isDisconnected: boolean;
  isCheckingConnection: boolean;
  reconnectError: string | null;
  checkConnection: () => Promise<boolean>;
}

const TurfContext = createContext<TurfContextType | undefined>(undefined);

// Initial Production Users with standard UUIDs
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@turf.com';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.NEXT_PUBLIC_ADMIN_NAME || 'Turf Facility Owner';

const INITIAL_USERS: UserProfile[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    full_name: ADMIN_NAME,
    role: 'owner',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    email: 'staff@turf.com',
    password: 'staff123',
    full_name: 'staff',
    role: 'staff',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export function TurfProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drinkSales, setDrinkSales] = useState<DrinkSale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlySubscriptions, setMonthlySubscriptions] = useState<MonthlySubscription[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Sync state & connection monitoring
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isDisconnected, setIsDisconnected] = useState<boolean>(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const pendingOfflineCount = 0; // Offline feature removed

  // 1. Initial LocalStorage restoration effect
  useEffect(() => {
    try {
      const storedBookings = localStorage.getItem('turfarena_bookings_v2');
      if (storedBookings) {
        const parsed = JSON.parse(storedBookings);
        if (Array.isArray(parsed) && parsed.length > 0) setBookings(parsed);
      }

      const storedExpenses = localStorage.getItem('turfarena_expenses_v2');
      if (storedExpenses) {
        const parsed = JSON.parse(storedExpenses);
        if (Array.isArray(parsed) && parsed.length > 0) setExpenses(parsed);
      }

      const storedDrinks = localStorage.getItem('turfarena_drinks_v2');
      if (storedDrinks) {
        const parsed = JSON.parse(storedDrinks);
        if (Array.isArray(parsed) && parsed.length > 0) setDrinkSales(parsed);
      }

      const storedShifts = localStorage.getItem('turfarena_shifts_v2');
      if (storedShifts) {
        const parsed = JSON.parse(storedShifts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShifts(parsed);
          const active = parsed.find((s: Shift) => s.status === 'active');
          if (active) setCurrentShift(active);
        }
      }

      // Immediate local auth verification for sub-millisecond page rendering
      const token = getAuthToken();
      if (token) {
        const payload = verifyAndDecodeJWT(token);
        if (payload) {
          const foundUser = INITIAL_USERS.find(
            (u: UserProfile) => u.id === payload.sub && u.is_active !== false
          );
          if (foundUser) {
            setCurrentUser(foundUser);
          }
        }
      }
    } catch (e) {
      console.warn('Local storage initial load warning:', e);
    } finally {
      setTimeout(() => {
        setIsLoaded(true);
      }, 0);
    }
  }, []);

  // 2. Auto-save state changes to localStorage
  useEffect(() => {
    if (bookings.length > 0) {
      try {
        localStorage.setItem('turfarena_bookings_v2', JSON.stringify(bookings));
      } catch (e) {}
    }
  }, [bookings]);

  useEffect(() => {
    if (expenses.length > 0) {
      try {
        localStorage.setItem('turfarena_expenses_v2', JSON.stringify(expenses));
      } catch (e) {}
    }
  }, [expenses]);

  useEffect(() => {
    if (drinkSales.length > 0) {
      try {
        localStorage.setItem('turfarena_drinks_v2', JSON.stringify(drinkSales));
      } catch (e) {}
    }
  }, [drinkSales]);

  useEffect(() => {
    if (shifts.length > 0) {
      try {
        localStorage.setItem('turfarena_shifts_v2', JSON.stringify(shifts));
      } catch (e) {}
    }
  }, [shifts]);

  // Main loader: Load live production data directly from Supabase (Concurrent Parallel Loading)
  const loadLiveSupabaseData = async () => {
    setSyncStatus('syncing');
    try {
      if (isSupabaseConfigured) {
        // Execute all 8 database queries in parallel for ultra-fast response
        const [
          { data: supaSettings },
          { data: supaProfiles },
          { data: supaShifts },
          { data: supaBookings },
          { data: supaDrinks },
          { data: supaExpenses },
          { data: supaSubs },
          { data: supaLogs },
        ] = await Promise.all([
          supabase.from('settings').select('*').single(),
          supabase.from('profiles').select('*'),
          supabase.from('shifts').select('*').order('start_time', { ascending: false }),
          supabase.from('bookings').select('*').order('created_at', { ascending: false }),
          supabase.from('drink_sales').select('*').order('created_at', { ascending: false }),
          supabase.from('expenses').select('*').order('created_at', { ascending: false }),
          supabase.from('monthly_subscriptions').select('*').order('created_at', { ascending: false }),
          supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }),
        ]);

        // 1. Settings
        if (supaSettings) {
          setSettings((prev) => ({ ...prev, ...supaSettings }));
        }

        // 2. Profiles / Users
        let currentUsers = [...INITIAL_USERS];
        if (supaProfiles && Array.isArray(supaProfiles) && supaProfiles.length > 0) {
          supaProfiles.forEach((sp: any) => {
            const idx = currentUsers.findIndex(
              (u) => u.id === sp.id || (u.email && sp.email && u.email.toLowerCase() === sp.email.toLowerCase())
            );
            const defaultPass = sp.role === 'owner' ? ADMIN_PASSWORD : 'staff123';
            const pass = sp.password || (idx >= 0 ? currentUsers[idx].password : defaultPass);

            const profileObj = {
              ...sp,
              password: pass,
              is_active: sp.is_active ?? true,
            };

            if (idx >= 0) {
              currentUsers[idx] = { ...currentUsers[idx], ...profileObj };
            } else {
              currentUsers.push(profileObj);
            }
          });
        }
        setUsers(currentUsers);

        // 3. Shifts
        if (supaShifts && Array.isArray(supaShifts)) {
          setShifts((prevLocal) => {
            const shiftMap = new Map<string, Shift>();
            (prevLocal || []).forEach((s) => shiftMap.set(s.id, s));
            supaShifts.forEach((ss: Shift) => shiftMap.set(ss.id, ss));
            const merged = Array.from(shiftMap.values()).sort(
              (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
            );
            const activeShift = merged.find((s: Shift) => s.status === 'active');
            if (activeShift) setCurrentShift(activeShift);
            return merged;
          });
        }

        // 4. Bookings (Smart merge with local storage payments to preserve staff updates)
        if (supaBookings && Array.isArray(supaBookings)) {
          setBookings((prevLocal) => {
            const localMap = new Map<string, Booking>();
            prevLocal.forEach((b) => localMap.set(b.id, b));

            const mergedList: Booking[] = supaBookings.map((sb: Booking) => {
              const lb = localMap.get(sb.id);
              if (!lb) return sb;

              const maxCash = Math.max(sb.cash_paid || 0, lb.cash_paid || 0);
              const maxGpay = Math.max(sb.gpay_paid || 0, lb.gpay_paid || 0);
              const maxDiscount = Math.max(sb.discount || 0, lb.discount || 0);
              const advance = Math.max(sb.advance_amount || 0, lb.advance_amount || 0);

              const recordMap = new Map<string, PaymentRecord>();
              (lb.payment_records || []).forEach((r) => recordMap.set(r.id, r));
              (sb.payment_records || []).forEach((r) => recordMap.set(r.id, r));

              const mergedRecords = Array.from(recordMap.values()).sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );

              const totalPrice = sb.total_price || lb.total_price;
              const finalAmount = Math.max(0, totalPrice - maxDiscount);
              const totalPaid = advance + maxCash + maxGpay;
              const outstanding = Math.max(0, finalAmount - totalPaid);

              let status: BookingStatus = sb.status;
              if (status !== 'cancelled' && status !== 'monthly_subscriber') {
                if (outstanding <= 0 && finalAmount > 0) status = 'paid';
                else if (advance > 0 && outstanding > 0) status = 'advance_received';
                else if (outstanding > 0) status = 'pending';
              }

              return {
                ...sb,
                ...lb,
                cash_paid: maxCash,
                gpay_paid: maxGpay,
                discount: maxDiscount,
                advance_amount: advance,
                final_amount: finalAmount,
                outstanding_balance: outstanding,
                pending_amount: sb.pending_amount !== undefined ? sb.pending_amount : lb.pending_amount !== undefined ? lb.pending_amount : outstanding,
                is_pos_confirmed: Boolean(sb.is_pos_confirmed || lb.is_pos_confirmed),
                status,
                payment_records: normalizeBookingPaymentRecords({
                  ...sb,
                  ...lb,
                  advance_amount: advance,
                  cash_paid: maxCash,
                  gpay_paid: maxGpay,
                  payment_records: mergedRecords,
                }),
                updated_at: new Date().toISOString(),
              };
            });

            const supaIds = new Set(supaBookings.map((sb: Booking) => sb.id));
            prevLocal.forEach((lb) => {
              if (!supaIds.has(lb.id)) {
                mergedList.push(lb);
              }
            });

            return mergedList;
          });
        }

        // 5. Drink Sales (Smart merge preferring server's updated status so Admin receives Staff updates)
        if (supaDrinks && Array.isArray(supaDrinks)) {
          setDrinkSales((prevLocal) => {
            const drinkMap = new Map<string, DrinkSale>();
            (prevLocal || []).forEach((d) => drinkMap.set(d.id, d));
            supaDrinks.forEach((sd: DrinkSale) => {
              const localItem = drinkMap.get(sd.id);
              drinkMap.set(sd.id, {
                ...localItem,
                ...sd,
                is_paid: sd.is_paid !== undefined ? Boolean(sd.is_paid) : localItem?.is_paid ?? false,
                payment_method: sd.payment_method || localItem?.payment_method || 'cash',
              });
            });
            return Array.from(drinkMap.values()).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }

        // 6. Expenses (Smart merge with local storage)
        if (supaExpenses && Array.isArray(supaExpenses)) {
          setExpenses((prevLocal) => {
            const expMap = new Map<string, Expense>();
            (prevLocal || []).forEach((e) => expMap.set(e.id, e));
            supaExpenses.forEach((se: Expense) => expMap.set(se.id, se));
            return Array.from(expMap.values()).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }

        // 7. Monthly Subscriptions (Smart merge with local storage)
        if (supaSubs && Array.isArray(supaSubs)) {
          setMonthlySubscriptions((prevLocal) => {
            const subMap = new Map<string, MonthlySubscription>();
            (prevLocal || []).forEach((s) => subMap.set(s.id, s));
            supaSubs.forEach((ss: MonthlySubscription) => subMap.set(ss.id, ss));
            return Array.from(subMap.values()).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }

        // 8. Activity Logs
        if (supaLogs) setActivityLogs(supaLogs);

        // Validate Auth JWT token
        const token = getAuthToken();
        if (token) {
          const payload = verifyAndDecodeJWT(token);
          if (payload) {
            const foundUser = currentUsers.find((u: UserProfile) => u.id === payload.sub && u.is_active !== false);
            if (foundUser) {
              setCurrentUser(foundUser);
            } else {
              removeAuthToken();
              setCurrentUser(null);
            }
          } else {
            removeAuthToken();
            setCurrentUser(null);
          }
        }

        setIsDisconnected(false);
        setSyncStatus('synced');
      }
    } catch (err) {
      console.error('Supabase live load error:', err);
      setSyncStatus('failed');
      setIsDisconnected(true);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadLiveSupabaseData();
  }, []);

  // Supabase Realtime Postgres Changes WebSocket Subscription
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('turf-realtime-global-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === 'INSERT') {
            setBookings((prev) => [newRow as Booking, ...prev.filter((b) => b.id !== newRow.id)]);
          } else if (eventType === 'UPDATE') {
            const updatedRow = newRow as Booking;
            setBookings((prev) =>
              prev.map((b) => {
                if (b.id === updatedRow.id) {
                  const records =
                    Array.isArray(updatedRow.payment_records) && updatedRow.payment_records.length > 0
                      ? updatedRow.payment_records
                      : b.payment_records || [];
                  return { ...updatedRow, payment_records: records };
                }
                return b;
              })
            );
          } else if (eventType === 'DELETE') {
            setBookings((prev) => prev.filter((b) => b.id !== oldRow.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        (payload) => {
          const { eventType, new: newRow } = payload;
          if (eventType === 'INSERT') {
            setShifts((prev) => [newRow as Shift, ...prev.filter((s) => s.id !== newRow.id)]);
            if ((newRow as Shift).status === 'active') setCurrentShift(newRow as Shift);
          } else if (eventType === 'UPDATE') {
            setShifts((prev) => prev.map((s) => (s.id === newRow.id ? (newRow as Shift) : s)));
            if ((newRow as Shift).status === 'active') {
              setCurrentShift(newRow as Shift);
            } else if ((newRow as Shift).status === 'closed') {
              setCurrentShift((prev) => (prev?.id === newRow.id ? null : prev));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drink_sales' },
        (payload) => {
          const { eventType, new: newRow } = payload;
          if (eventType === 'INSERT') {
            setDrinkSales((prev) => [newRow as DrinkSale, ...prev.filter((d) => d.id !== newRow.id)]);
          } else if (eventType === 'UPDATE') {
            setDrinkSales((prev) => prev.map((d) => (d.id === newRow.id ? (newRow as DrinkSale) : d)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          const { eventType, new: newRow } = payload;
          if (eventType === 'INSERT') {
            setExpenses((prev) => [newRow as Expense, ...prev.filter((e) => e.id !== newRow.id)]);
          } else if (eventType === 'UPDATE') {
            setExpenses((prev) => prev.map((e) => (e.id === newRow.id ? (newRow as Expense) : e)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_subscriptions' },
        (payload) => {
          const { eventType, new: newRow } = payload;
          if (eventType === 'INSERT') {
            setMonthlySubscriptions((prev) => [newRow as MonthlySubscription, ...prev.filter((m) => m.id !== newRow.id)]);
          } else if (eventType === 'UPDATE') {
            setMonthlySubscriptions((prev) => prev.map((m) => (m.id === newRow.id ? (newRow as MonthlySubscription) : m)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          const { new: newRow } = payload;
          if (newRow && 'id' in newRow) {
            const profileRow = newRow as UserProfile;
            setUsers((prev) => {
              const idx = prev.findIndex((u) => u.id === profileRow.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...profileRow };
                return updated;
              }
              return [...prev, profileRow];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          const { new: newRow } = payload;
          if (newRow && Object.keys(newRow).length > 0) {
            setSettings((prev) => ({ ...prev, ...(newRow as any) }));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsDisconnected(false);
          setSyncStatus('synced');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          setIsDisconnected(true);
          setSyncStatus('failed');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper function to log activity actions directly to Supabase
  const logAction = (
    action: string,
    entityType: ActivityLog['entity_type'],
    entityId?: string,
    prevVal?: string,
    newVal?: string
  ) => {
    if (!currentUser) return;
    const log: ActivityLog = {
      id: generateUUID(),
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      user_role: currentUser.role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      previous_value: prevVal,
      new_value: newVal,
      device: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
      timestamp: new Date().toISOString(),
    };

    setActivityLogs((prev) => [log, ...prev]);

    fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    }).catch((err) => console.warn('Activity log sync note:', err));
  };

  // Auth & User Roles
  const role: UserRole = currentUser?.role || 'staff';

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      const token = generateJWTToken(target);
      setAuthToken(token);
      logAction(`Switched account to ${target.full_name}`, 'user', target.id);
    }
  };

  const login = (
    emailOrUsername: string,
    passwordInput?: string
  ): { success: boolean; error?: string; user?: UserProfile } => {
    const query = emailOrUsername.trim().toLowerCase();
    const queryAlpha = query.replace(/[^a-z0-9]/gi, '');

    let pool = [...users];
    INITIAL_USERS.forEach((iu) => {
      const idx = pool.findIndex(
        (u) => u.id === iu.id || (u.email && iu.email && u.email.toLowerCase() === iu.email.toLowerCase())
      );
      if (idx < 0) pool.push(iu);
    });

    const found = pool.find((u) => {
      if (u.is_active === false) return false;

      const fullName = u.full_name ? u.full_name.trim() : '';
      const fullNameLower = fullName.toLowerCase();
      const cleanName = fullNameLower.replace(/\(staff\)/gi, '').trim();
      const userEmail = u.email ? u.email.trim().toLowerCase() : '';
      const emailUsername = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;

      const cleanNameAlpha = cleanName.replace(/[^a-z0-9]/gi, '');
      const fullNameAlpha = fullNameLower.replace(/[^a-z0-9]/gi, '');
      const emailUsernameAlpha = emailUsername.replace(/[^a-z0-9]/gi, '');

      return (
        cleanName === query ||
        fullNameLower === query ||
        userEmail === query ||
        emailUsername === query ||
        (queryAlpha.length > 0 && cleanNameAlpha === queryAlpha) ||
        (queryAlpha.length > 0 && fullNameAlpha === queryAlpha) ||
        (queryAlpha.length > 0 && emailUsernameAlpha === queryAlpha) ||
        u.id.toLowerCase() === query
      );
    });

    if (!found) {
      return { success: false, error: 'User account not found or disabled.' };
    }

    const expectedPassword = found.password || (found.role === 'owner' ? ADMIN_PASSWORD : 'staff123');
    const inputPass = passwordInput ? passwordInput : '';
    const trimmedInputPass = passwordInput ? passwordInput.trim() : '';

    if (inputPass !== expectedPassword && trimmedInputPass !== expectedPassword) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    setCurrentUser(found);
    const token = generateJWTToken(found);
    setAuthToken(token);
    logAction(`Logged in as ${found.full_name}`, 'user', found.id);

    return { success: true, user: found };
  };

  const logout = () => {
    if (currentUser) {
      logAction('Logged out - JWT token revoked', 'user', currentUser.id);
    }
    removeAuthToken();
    setCurrentUser(null);
  };

  const createStaffAccount = (name: string, email: string, phone: string, password?: string) => {
    const newUser: UserProfile = {
      id: generateUUID(),
      email,
      full_name: name,
      role: 'staff',
      phone: phone || '',
      password: password || 'staff123',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);

    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        phone: newUser.phone || '',
        password: newUser.password,
      }),
    }).catch((err) => console.warn('Staff API sync note:', err));

    logAction(`Created staff account: ${name}`, 'user', newUser.id);
  };

  const resetStaffPassword = (userId: string, newPassword: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, password: newPassword } : u)));
    if (isSupabaseConfigured) {
      supabase.from('profiles').update({ password: newPassword }).eq('id', userId).then();
    }
    logAction(`Reset password for staff ID: ${userId}`, 'user', userId);
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u))
    );
    const target = users.find((u) => u.id === userId);
    if (isSupabaseConfigured && target) {
      supabase.from('profiles').update({ is_active: !target.is_active }).eq('id', userId).then();
    }
    logAction(`Toggled staff status for ${userId}`, 'user', userId);
  };

  const deleteStaffAccount = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (isSupabaseConfigured) {
      supabase.from('profiles').delete().eq('id', userId).then();
    }
    logAction(`Deleted staff account ${userId}`, 'user', userId);
  };

  // Shift System
  const startShift = async (openingCash: number): Promise<Shift> => {
    if (!currentUser) throw new Error('User must be logged in to start a shift');

    const newShift: Shift = {
      id: generateUUID(),
      staff_id: currentUser.id,
      staff_name: currentUser.full_name,
      start_time: new Date().toISOString(),
      opening_cash: Number(openingCash) || 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    setCurrentShift(newShift);
    setShifts((prev) => [newShift, ...prev]);

    fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newShift),
    }).catch((err) => console.warn('Start shift sync note:', err));

    logAction(`Started Shift with Opening Cash ₹${openingCash}`, 'shift', newShift.id);

    return newShift;
  };

  const endShift = async (shiftNotes?: string): Promise<ShiftSummary> => {
    if (!currentShift) throw new Error('No active shift to close');

    const endTime = new Date().toISOString();
    const durationMs = new Date(endTime).getTime() - new Date(currentShift.start_time).getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationFormatted = `${durationHours}h ${durationMinutes}m`;

    const shiftBookings = bookings.filter((b) => b.shift_id === currentShift.id && !b.is_deleted);
    const shiftDrinks = drinkSales.filter((d) => d.shift_id === currentShift.id && !d.is_deleted);
    const shiftExpensesList = expenses.filter((e) => e.shift_id === currentShift.id && !e.is_deleted);

    let footballRevenue = 0;
    let badmintonRevenue = 0;
    let totalDiscount = 0;
    let cashCollected = 0;
    let gpayCollected = 0;
    let outstandingGenerated = 0;

    shiftBookings.forEach((b) => {
      if (b.status !== 'cancelled') {
        if (b.court_type === 'football') {
          footballRevenue += b.final_amount;
        } else {
          badmintonRevenue += b.final_amount;
        }
        totalDiscount += b.discount || 0;
        cashCollected += (b.cash_paid || 0) + (b.advance_method === 'cash' ? b.advance_amount : 0);
        gpayCollected += (b.gpay_paid || 0) + (b.advance_method === 'gpay' ? b.advance_amount : 0);
        outstandingGenerated += b.outstanding_balance || 0;
      }
    });

    let drinkRevenue = 0;
    shiftDrinks.forEach((d) => {
      drinkRevenue += d.total_price;
      if (d.payment_method === 'cash') cashCollected += d.total_price;
      else gpayCollected += d.total_price;
    });

    let totalExpenses = 0;
    let cashExpenses = 0;
    shiftExpensesList.forEach((e) => {
      totalExpenses += e.amount;
      if (e.payment_method === 'cash') cashExpenses += e.amount;
    });

    const grossCollection = footballRevenue + badmintonRevenue + drinkRevenue;
    const netCashInHand = currentShift.opening_cash + cashCollected - cashExpenses;

    const summary: ShiftSummary = {
      shift_id: currentShift.id,
      staff_name: currentShift.staff_name,
      duration_formatted: durationFormatted,
      football_revenue: footballRevenue,
      badminton_revenue: badmintonRevenue,
      drink_revenue: drinkRevenue,
      total_discount: totalDiscount,
      total_expenses: totalExpenses,
      cash_collected: cashCollected,
      gpay_collected: gpayCollected,
      outstanding_generated: outstandingGenerated,
      gross_collection: grossCollection,
      net_cash_in_hand: netCashInHand,
      total_bookings_count: shiftBookings.length,
    };

    const closedShift: Shift = {
      ...currentShift,
      end_time: endTime,
      status: 'closed',
      closing_cash: netCashInHand,
      shift_notes: shiftNotes,
      summary,
    };

    setShifts((prev) => prev.map((s) => (s.id === closedShift.id ? closedShift : s)));
    setCurrentShift(null);

    fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(closedShift),
    }).catch((err) => console.warn('End shift sync note:', err));

    logAction(`Closed Shift - Net Collection: ₹${grossCollection}`, 'shift', closedShift.id);

    return summary;
  };

  const reopenShift = (shiftId: string) => {
    if (role !== 'owner') {
      return;
    }
    const target = shifts.find((s) => s.id === shiftId);
    if (!target) return;

    const reopened: Shift = { ...target, status: 'active', end_time: undefined };
    setCurrentShift(reopened);
    setShifts((prev) => prev.map((s) => (s.id === shiftId ? reopened : s)));

    fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reopened),
    }).catch((err) => console.warn('Reopen shift sync note:', err));

    logAction(`REOPENED CLOSED SHIFT (${shiftId})`, 'shift', shiftId);
  };

  // Bookings System
  const addBooking = (
    bookingData: Omit<
      Booking,
      | 'id'
      | 'shift_id'
      | 'booking_date'
      | 'created_by_user_id'
      | 'created_by_name'
      | 'created_at'
      | 'updated_at'
      | 'final_amount'
      | 'outstanding_balance'
    >
  ): Booking => {
    if (!currentUser) throw new Error('User not logged in');

    const totalHours = calculateDurationHours(bookingData.start_time, bookingData.end_time);
    const hourlyRate = calculateHourlyRate(bookingData.court_type, bookingData.start_time, settings);
    const totalPrice = Math.round(totalHours * hourlyRate);

    const discount = Number(bookingData.discount) || 0;
    const finalAmount = Math.max(0, totalPrice - discount);

    const advance = Number(bookingData.advance_amount) || 0;
    const cash = Number(bookingData.cash_paid) || 0;
    const gpay = Number(bookingData.gpay_paid) || 0;

    const totalPaidSoFar = advance + cash + gpay;
    const outstanding = Math.max(0, finalAmount - totalPaidSoFar);

    let calculatedStatus: BookingStatus = bookingData.status;
    if (outstanding <= 0 && finalAmount > 0) {
      calculatedStatus = 'paid';
    } else if (advance > 0 && outstanding > 0) {
      calculatedStatus = 'advance_received';
    } else if (outstanding > 0) {
      calculatedStatus = 'pending';
    }

    const activeShiftId = currentShift ? currentShift.id : undefined;

    let newBooking: Booking = {
      ...bookingData,
      id: generateUUID(),
      shift_id: activeShiftId,
      booking_date: new Date().toISOString(),
      total_hours: totalHours,
      rate_per_hour: hourlyRate,
      total_price: totalPrice,
      discount,
      final_amount: finalAmount,
      advance_amount: advance,
      cash_paid: cash,
      gpay_paid: gpay,
      outstanding_balance: outstanding,
      status: calculatedStatus,
      created_by_user_id: currentUser.id,
      created_by_name: currentUser.full_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    newBooking.payment_records = normalizeBookingPaymentRecords(newBooking);

    setBookings((prev) => [newBooking, ...prev]);

    if (isSupabaseConfigured) {
      const supaPayload = {
        ...newBooking,
        shift_id: activeShiftId || null,
      };
      supabase.from('bookings').upsert([supaPayload]).then(({ error }) => {
        if (error) console.error('Supabase direct booking upsert error:', error);
      });
    }

    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking),
    }).catch((err) => console.warn('Booking API sync note:', err));

    logAction(
      `Added Booking: ${newBooking.team_name} (${newBooking.court_type} ${newBooking.start_time}-${newBooking.end_time})`,
      'booking',
      newBooking.id
    );

    return newBooking;
  };

  const updateBooking = (id: string, updates: Partial<Booking>) => {
    let targetUpdated: Booking | null = null;

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const merged = { ...b, ...updates, updated_at: new Date().toISOString() };
          const discount = Number(merged.discount) || 0;
          const finalAmount = Math.max(0, merged.total_price - discount);
          const totalPaid =
            (merged.advance_amount || 0) + (merged.cash_paid || 0) + (merged.gpay_paid || 0);
          const outstanding =
            updates.outstanding_balance !== undefined
              ? Number(updates.outstanding_balance)
              : updates.pending_amount !== undefined
              ? Number(updates.pending_amount)
              : Math.max(0, finalAmount - totalPaid);

          merged.final_amount = finalAmount;
          merged.outstanding_balance = outstanding;
          merged.pending_amount =
            updates.pending_amount !== undefined ? Number(updates.pending_amount) : outstanding;

          if (merged.status !== 'cancelled' && merged.status !== 'monthly_subscriber') {
            if (outstanding <= 0 && finalAmount > 0) merged.status = 'paid';
            else if (merged.advance_amount > 0 && outstanding > 0) merged.status = 'advance_received';
            else if (outstanding > 0) merged.status = 'pending';
          }

          merged.payment_records = normalizeBookingPaymentRecords(merged);

          targetUpdated = merged;
          return merged;
        }
        return b;
      })
    );

    if (targetUpdated) {
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetUpdated),
      }).catch((err) => console.warn('Booking update API sync note:', err));
    }

    logAction(`Updated Booking (${id})`, 'booking', id);
  };

  const collectPayment = (
    bookingId: string,
    cashAmount: number,
    gpayAmount: number,
    discount: number = 0
  ) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const newCash = (target.cash_paid || 0) + Number(cashAmount);
    const newGpay = (target.gpay_paid || 0) + Number(gpayAmount);
    const newDiscount = (target.discount || 0) + Number(discount);

    const newRecords: PaymentRecord[] = [];
    if (Number(cashAmount) > 0) {
      newRecords.push({
        id: generateUUID(),
        booking_id: bookingId,
        amount: Number(cashAmount),
        payment_method: 'cash',
        staff_id: currentUser?.id || 'admin',
        staff_name: currentUser?.full_name || 'Staff',
        created_at: new Date().toISOString(),
      });
    }
    if (Number(gpayAmount) > 0) {
      newRecords.push({
        id: generateUUID(),
        booking_id: bookingId,
        amount: Number(gpayAmount),
        payment_method: 'gpay',
        staff_id: currentUser?.id || 'admin',
        staff_name: currentUser?.full_name || 'Staff',
        created_at: new Date().toISOString(),
      });
    }

    const updatedRecords = [...newRecords, ...(target.payment_records || [])];

    updateBooking(bookingId, {
      cash_paid: newCash,
      gpay_paid: newGpay,
      discount: newDiscount,
      payment_records: updatedRecords,
    });

    logAction(
      `Collected Payment for ${target.team_name}: Cash ₹${cashAmount}, GPay ₹${gpayAmount}`,
      'booking',
      bookingId
    );
  };

  const addPaymentRecord = (
    bookingId: string,
    amount: number,
    paymentMethod: 'cash' | 'gpay'
  ) => {
    if (!currentUser) return;
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) return;

    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const newRecord = {
      id: generateUUID(),
      booking_id: bookingId,
      amount: numAmount,
      payment_method: paymentMethod,
      staff_id: currentUser.id,
      staff_name: currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    const existingRecords = target.payment_records || [];
    const updatedRecords = [newRecord, ...existingRecords];

    const newCash = (target.cash_paid || 0) + (paymentMethod === 'cash' ? numAmount : 0);
    const newGpay = (target.gpay_paid || 0) + (paymentMethod === 'gpay' ? numAmount : 0);

    updateBooking(bookingId, {
      payment_records: updatedRecords,
      cash_paid: newCash,
      gpay_paid: newGpay,
    });

    logAction(
      `Added ${paymentMethod.toUpperCase()} Payment of ₹${numAmount} for ${target.team_name}`,
      'booking',
      bookingId
    );
  };

  const removePaymentRecord = (bookingId: string, recordId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const existingRecords = target.payment_records || [];
    const remainingRecords = existingRecords.filter((r) => r.id !== recordId);

    const newCash = remainingRecords
      .filter((r) => r.payment_method === 'cash')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const newGpay = remainingRecords
      .filter((r) => r.payment_method === 'gpay')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    updateBooking(bookingId, {
      payment_records: remainingRecords,
      cash_paid: newCash,
      gpay_paid: newGpay,
    });

    logAction(`Removed payment record from ${target.team_name}`, 'booking', bookingId);
  };

  const editPaymentRecord = (
    bookingId: string,
    recordId: string,
    newAmount: number,
    newPaymentMethod?: 'cash' | 'gpay'
  ) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const numAmount = Math.max(0, Number(newAmount) || 0);
    const existingRecords = target.payment_records || [];
    const updatedRecords = existingRecords.map((r) => {
      if (r.id === recordId) {
        return {
          ...r,
          amount: numAmount,
          payment_method: newPaymentMethod || r.payment_method,
        };
      }
      return r;
    });

    const newCash = updatedRecords
      .filter((r) => r.payment_method === 'cash')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const newGpay = updatedRecords
      .filter((r) => r.payment_method === 'gpay')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    updateBooking(bookingId, {
      payment_records: updatedRecords,
      cash_paid: newCash,
      gpay_paid: newGpay,
    });

    logAction(`Edited payment record for ${target.team_name} to ₹${numAmount}`, 'booking', bookingId);
  };

  const cancelBooking = (
    bookingId: string,
    reason: string,
    refundAmount: number,
    cancellationCharge: number
  ) => {
    updateBooking(bookingId, {
      status: 'cancelled',
      cancellation_reason: reason,
      refund_amount: Number(refundAmount) || 0,
      cancellation_charge: Number(cancellationCharge) || 0,
    });
    logAction(`Cancelled Booking (${bookingId}) - Reason: ${reason}`, 'booking', bookingId);
  };

  const softDeleteBooking = (bookingId: string) => {
    if (role !== 'owner') {
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));

    if (isSupabaseConfigured) {
      supabase.from('bookings').delete().eq('id', bookingId).then();
    }
    fetch(`/api/bookings?id=${bookingId}`, {
      method: 'DELETE',
    }).catch((err) => console.warn('Booking DELETE API note:', err));

    logAction(`Permanently deleted booking (${bookingId})`, 'booking', bookingId);
  };

  // Drinks Sales
  const addDrinkSale = (
    drinkType: DrinkType,
    quantity: number,
    paymentMethod: 'cash' | 'gpay',
    bookingId?: string
  ) => {
    if (!currentUser) return;
    const price = settings.drink_prices[drinkType] || 10;
    const drinkItem = DRINK_ITEMS.find((d) => d.id === drinkType);
    const drinkName = drinkItem?.name || drinkType;
    const totalPrice = price * quantity;
    const activeShiftId = currentShift ? currentShift.id : undefined;

    const sale: DrinkSale = {
      id: generateUUID(),
      shift_id: activeShiftId || generateUUID(),
      booking_id: bookingId,
      drink_type: drinkType,
      drink_name: drinkName,
      quantity,
      unit_price: price,
      total_price: totalPrice,
      payment_method: paymentMethod,
      staff_id: currentUser.id,
      staff_name: currentUser.full_name,
      is_paid: false,
      created_at: new Date().toISOString(),
    };

    setDrinkSales((prev) => {
      const updated = [sale, ...prev];
      try {
        localStorage.setItem('turfarena_drinks_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (isSupabaseConfigured) {
      supabase.from('drink_sales').upsert([sale]).then(({ error }) => {
        if (error && error.message && error.message.includes('is_paid')) {
          const { is_paid, ...saleWithoutIsPaid } = sale;
          supabase.from('drink_sales').upsert([saleWithoutIsPaid]).then();
        } else if (error) {
          console.error('Supabase direct drink sale upsert error:', error);
        }
      });
    }

    fetch('/api/drinks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
    }).catch((err) => console.warn('Drink sale sync note:', err));

    logAction(
      `Sold Drinks: ${quantity}x ${drinkName} (₹${totalPrice} via ${paymentMethod})`,
      'drink',
      sale.id
    );
  };

  const removeDrinkSale = (drinkSaleId: string) => {
    setDrinkSales((prev) =>
      prev.map((d) => (d.id === drinkSaleId ? { ...d, is_deleted: true } : d))
    );
    if (isSupabaseConfigured) {
      supabase.from('drink_sales').update({ is_deleted: true }).eq('id', drinkSaleId).then();
    }
    logAction(`Removed drink sale (${drinkSaleId})`, 'drink', drinkSaleId);
  };

  const toggleDrinkPaidStatus = (drinkSaleId: string) => {
    const target = drinkSales.find((d) => d.id === drinkSaleId);
    if (!target) return;

    setDrinkSales((prev) =>
      prev.map((d) => (d.id === drinkSaleId ? { ...d, is_paid: !d.is_paid } : d))
    );
    if (isSupabaseConfigured) {
      supabase.from('drink_sales').update({ is_paid: !target.is_paid }).eq('id', drinkSaleId).then();
    }
    logAction(`Toggled drink paid status (${drinkSaleId})`, 'drink', drinkSaleId);
  };

  const updateDrinkPaidMethod = (
    drinkSaleId: string,
    targetMethod: 'cash' | 'gpay'
  ) => {
    const target = drinkSales.find((d) => d.id === drinkSaleId);
    if (!target) return;

    let newIsPaid: boolean;
    let newMethod: 'cash' | 'gpay' = targetMethod;

    if (target.is_paid && target.payment_method === targetMethod) {
      // Toggle off if already paid via this method
      newIsPaid = false;
    } else {
      newIsPaid = true;
    }

    setDrinkSales((prev) => {
      const updated = prev.map((d) =>
        d.id === drinkSaleId
          ? { ...d, is_paid: newIsPaid, payment_method: newMethod }
          : d
      );
      try {
        localStorage.setItem('turfarena_drinks_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (isSupabaseConfigured) {
      supabase
        .from('drink_sales')
        .update({ is_paid: newIsPaid, payment_method: newMethod })
        .eq('id', drinkSaleId)
        .then(({ error }) => {
          if (error && error.message && error.message.includes('is_paid')) {
            supabase.from('drink_sales').update({ payment_method: newMethod }).eq('id', drinkSaleId).then();
          }
        });
    }

    fetch('/api/drinks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...target, is_paid: newIsPaid, payment_method: newMethod }),
    }).catch((err) => console.warn('Drink sale update sync note:', err));

    logAction(
      `Updated drink sale (${drinkSaleId}): paid=${newIsPaid}, method=${newMethod}`,
      'drink',
      drinkSaleId
    );
  };

  // Expenses System
  const addExpense = (
    category: string,
    description: string,
    amount: number,
    paymentMethod: 'cash' | 'gpay'
  ) => {
    if (!currentUser) return;
    const activeShiftId = currentShift ? currentShift.id : undefined;

    const newExpense: Expense = {
      id: generateUUID(),
      shift_id: activeShiftId || generateUUID(),
      category,
      description,
      amount: Number(amount) || 0,
      payment_method: paymentMethod,
      staff_id: currentUser.id,
      staff_name: currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => [newExpense, ...prev]);

    fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense),
    }).catch((err) => console.warn('Expense sync note:', err));

    logAction(
      `Logged Expense: ₹${amount} for ${category} (${description})`,
      'expense',
      newExpense.id
    );
  };

  const removeExpense = (expenseId: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, is_deleted: true } : e))
    );

    if (isSupabaseConfigured) {
      supabase.from('expenses').update({ is_deleted: true }).eq('id', expenseId).then(({ error }) => {
        if (error) console.error('Supabase direct expense delete error:', error);
      });
    }

    logAction(`Deleted expense entry (${expenseId})`, 'expense', expenseId);
  };

  const updateExpense = (expenseId: string, updates: Partial<Expense>) => {
    const target = expenses.find((e) => e.id === expenseId);
    if (!target) return;

    const updatedExpense = { ...target, ...updates };

    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? updatedExpense : e))
    );

    if (isSupabaseConfigured) {
      supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId)
        .then(({ error }) => {
          if (error) console.error('Supabase direct expense update error:', error);
        });
    }

    fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedExpense),
    }).catch((err) => console.warn('Expense update sync note:', err));

    logAction(`Updated expense entry (${expenseId})`, 'expense', expenseId);
  };

  const addCustomExpenseCategory = (category: string) => {
    if (!category || settings.expense_categories.includes(category)) return;
    updateSettings({
      expense_categories: [...settings.expense_categories, category],
    });
  };

  // Subscriptions System
  const addSubscription = (sub: Omit<MonthlySubscription, 'id' | 'created_at'>) => {
    const newSub: MonthlySubscription = {
      ...sub,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setMonthlySubscriptions((prev) => [newSub, ...prev]);

    fetch('/api/monthly-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
    }).catch((err) => console.warn('Subscription sync note:', err));

    logAction(`Added Monthly Subscription: ${newSub.team_name}`, 'subscription', newSub.id);
  };

  const toggleSubscriptionStatus = (id: string) => {
    const target = monthlySubscriptions.find((s) => s.id === id);
    if (!target) return;

    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    setMonthlySubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus as any } : s))
    );

    if (isSupabaseConfigured) {
      supabase.from('monthly_subscriptions').update({ status: newStatus }).eq('id', id).then();
    }
  };

  // Facility Settings System
  const updateSettings = (newSettings: Partial<Settings>) => {
    if (role !== 'owner') {
      return;
    }
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch((err) => console.warn('Settings sync note:', err));

    logAction('Updated Facility Pricing / Settings', 'setting');
  };

  // Connection test function for manual refresh and auto checks
  const checkConnection = async (): Promise<boolean> => {
    setIsCheckingConnection(true);
    setReconnectError(null);

    // 1. Check browser network status
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setIsDisconnected(true);
      setSyncStatus('offline');
      setReconnectError('Browser is offline. Please check your internet connection.');
      setIsCheckingConnection(false);
      return false;
    }

    // 2. Test Supabase database ping with 5s timeout
    try {
      if (!isSupabaseConfigured) {
        setIsDisconnected(false);
        setSyncStatus('synced');
        setIsCheckingConnection(false);
        return true;
      }

      const pingPromise = supabase.from('settings').select('facility_name').limit(1);
      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Database ping request timed out')), 5000)
      );

      const res = await Promise.race([pingPromise, timeoutPromise]);
      if ((res as any)?.error) {
        throw (res as any).error;
      }

      setIsDisconnected(false);
      setSyncStatus('synced');
      setReconnectError(null);
      await loadLiveSupabaseData();
      setIsCheckingConnection(false);
      return true;
    } catch (err: any) {
      console.warn('Supabase database connectivity check failed:', err);
      setIsDisconnected(true);
      setSyncStatus('failed');
      setReconnectError('Unable to connect to database. Please check your internet connection and try again.');
      setIsCheckingConnection(false);
      return false;
    }
  };

  // Browser Online / Offline listeners & Periodic Heartbeat
  useEffect(() => {
    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setIsDisconnected(true);
      setSyncStatus('offline');
      setReconnectError('Browser is offline. Please check your internet connection.');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Heartbeat check every 12 seconds
    const intervalId = setInterval(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        setIsDisconnected(true);
        setSyncStatus('offline');
      } else if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('settings')
            .select('facility_name')
            .limit(1);

          if (error) {
            setIsDisconnected(true);
            setSyncStatus('failed');
          } else {
            setIsDisconnected((prev) => {
              if (prev) {
                // If it was disconnected previously, re-fetch live data
                loadLiveSupabaseData();
              }
              return false;
            });
            setSyncStatus('synced');
          }
        } catch (e) {
          setIsDisconnected(true);
          setSyncStatus('failed');
        }
      }
    }, 12000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      clearInterval(intervalId);
    };
  }, []);

  // Prevent mouse wheel scrolling from changing values on any numeric input field globally
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLInputElement && activeEl.type === 'number') {
        activeEl.blur();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('wheel', handleWheel, { passive: true });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  // Manual Trigger to re-fetch live production state from Supabase
  const triggerManualSync = async () => {
    await checkConnection();
  };

  const value = useMemo(
    () => ({
      user: currentUser,
      role,
      users,
      switchUser,
      login,
      logout,
      createStaffAccount,
      resetStaffPassword,
      toggleUserStatus,
      deleteStaffAccount,
      currentShift,
      shifts,
      startShift,
      endShift,
      reopenShift,
      bookings,
      addBooking,
      updateBooking,
      collectPayment,
      addPaymentRecord,
      removePaymentRecord,
      editPaymentRecord,
      cancelBooking,
      softDeleteBooking,
      drinkSales,
      addDrinkSale,
      removeDrinkSale,
      toggleDrinkPaidStatus,
      updateDrinkPaidMethod,
      expenses,
      addExpense,
      removeExpense,
      updateExpense,
      addCustomExpenseCategory,
      monthlySubscriptions,
      addSubscription,
      toggleSubscriptionStatus,
      settings,
      updateSettings,
      activityLogs,
      logAction,
      syncStatus,
      pendingOfflineCount,
      triggerManualSync,
      isLoaded,
      isDisconnected,
      isCheckingConnection,
      reconnectError,
      checkConnection,
    }),
    [
      currentUser,
      role,
      users,
      currentShift,
      shifts,
      bookings,
      drinkSales,
      expenses,
      monthlySubscriptions,
      settings,
      activityLogs,
      syncStatus,
      isLoaded,
      isDisconnected,
      isCheckingConnection,
      reconnectError,
    ]
  );

  return <TurfContext.Provider value={value}>{children}</TurfContext.Provider>;
}

export function useTurf() {
  const context = useContext(TurfContext);
  if (!context) {
    throw new Error('useTurf must be used within a TurfProvider');
  }
  return context;
}
