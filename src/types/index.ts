export type UserRole = 'owner' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  phone?: string;
  password?: string;
  created_at: string;
}

export type CourtType = 'football' | 'badminton_synthetic' | 'badminton_wooden';

export type BookingType = 'football' | 'badminton_daily' | 'badminton_monthly' | 'walk_in';

export type BookingSource = 'booking_app' | 'phone' | 'walk_in';

export type BookingStatus = 'paid' | 'advance_received' | 'pending' | 'cancelled' | 'monthly_subscriber';

export type PaymentMethod = 'cash' | 'gpay' | 'split';

export interface PaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: 'cash' | 'gpay';
  staff_id: string;
  staff_name: string;
  created_at: string;
}

export interface Booking {
  id: string;
  shift_id?: string;
  team_name: string;
  customer_name: string;
  phone: string;
  court_type: CourtType;
  booking_type: BookingType;
  source: BookingSource;
  reference_id?: string;
  booking_date: string;
  play_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM (24-hour format)
  end_time: string; // HH:MM (24-hour format)
  total_hours: number;
  rate_per_hour: number;
  total_price: number;
  discount: number;
  final_amount: number;
  advance_amount: number;
  advance_method?: 'cash' | 'gpay';
  cash_paid: number;
  gpay_paid: number;
  outstanding_balance: number;
  payment_records?: PaymentRecord[];
  status: BookingStatus;
  cancellation_reason?: string;
  refund_amount?: number;
  cancellation_charge?: number;
  notes?: string;
  created_by_user_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export type DrinkType = 'normal_soda' | 'mint_soda' | 'color_soda' | 'jeera_soda';

export interface DrinkItem {
  id: DrinkType;
  name: string;
  category: 'normal' | 'special';
  price: number;
}

export interface DrinkSale {
  id: string;
  shift_id: string;
  booking_id?: string;
  drink_type: DrinkType;
  drink_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: 'cash' | 'gpay';
  staff_id: string;
  staff_name: string;
  created_at: string;
  is_paid?: boolean;
  is_deleted?: boolean;
}

export type ExpenseCategory =
  | 'Drinks'
  | 'Electricity'
  | 'Cleaning'
  | 'Maintenance'
  | 'Equipment'
  | 'Staff Tea'
  | 'Salary'
  | 'Shuttle'
  | 'Miscellaneous'
  | string;

export interface Expense {
  id: string;
  shift_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: 'cash' | 'gpay';
  staff_id: string;
  staff_name: string;
  created_at: string;
  is_deleted?: boolean;
}

export interface Shift {
  id: string;
  staff_id: string;
  staff_name: string;
  start_time: string; // ISO timestamp
  end_time?: string; // ISO timestamp
  opening_cash: number;
  closing_cash?: number;
  status: 'active' | 'closed';
  shift_notes?: string;
  summary?: ShiftSummary;
  created_at: string;
}

export interface ShiftSummary {
  shift_id: string;
  staff_name: string;
  duration_formatted: string;
  football_revenue: number;
  badminton_revenue: number;
  drink_revenue: number;
  total_discount: number;
  total_expenses: number;
  cash_collected: number;
  gpay_collected: number;
  outstanding_generated: number;
  gross_collection: number;
  net_cash_in_hand: number; // Opening Cash + Cash Collected - Cash Expenses
  total_bookings_count: number;
}

export interface MonthlySubscription {
  id: string;
  team_name: string;
  customer_name: string;
  phone: string;
  court_type: CourtType;
  days_of_week: number[]; // 0=Sunday, 1=Monday... 6=Saturday
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  monthly_amount: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
}

export interface Settings {
  facility_name: string;
  phone: string;
  address: string;
  football_morning_rate: number; // ₹600
  football_night_rate: number; // ₹1000
  football_night_start_hour: number; // e.g., 18 (6 PM)
  badminton_synthetic_rate: number; // ₹350
  badminton_wooden_rate: number; // ₹400
  drink_prices: Record<DrinkType, number>;
  expense_categories: string[];
}

export interface Customer {
  phone: string;
  name: string;
  team_name: string;
  total_visits: number;
  last_played: string;
  total_spent: number;
  outstanding_amount: number;
  avg_spend_per_visit: number;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action: string;
  entity_type: 'booking' | 'shift' | 'drink' | 'expense' | 'setting' | 'user' | 'subscription';
  entity_id?: string;
  previous_value?: string;
  new_value?: string;
  device?: string;
  timestamp: string;
}

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'failed';

export interface OfflineAction {
  id: string;
  type: 'CREATE_BOOKING' | 'UPDATE_BOOKING' | 'ADD_DRINK' | 'ADD_EXPENSE' | 'START_SHIFT' | 'END_SHIFT';
  payload: any;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
}
