-- Turf Management System Database Schema & RLS Policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  phone TEXT,
  password TEXT DEFAULT 'staff123',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  facility_name TEXT NOT NULL DEFAULT 'Orion Turf',
  phone TEXT DEFAULT '+91 98765 43210',
  address TEXT DEFAULT 'Kochi Sports Hub, Kerala',
  football_morning_rate NUMERIC DEFAULT 600,
  football_night_rate NUMERIC DEFAULT 1000,
  football_night_start_hour INT DEFAULT 18,
  badminton_synthetic_rate NUMERIC DEFAULT 350,
  badminton_wooden_rate NUMERIC DEFAULT 400,
  drink_prices JSONB DEFAULT '{"normal_soda": 10, "mint_soda": 12, "color_soda": 12, "jeera_soda": 12}'::jsonb,
  expense_categories JSONB DEFAULT '["Electricity", "Cleaning", "Maintenance", "Equipment", "Staff Tea", "Salary", "Shuttle", "Miscellaneous"]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES public.profiles(id),
  staff_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
  shift_notes TEXT,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES public.shifts(id),
  team_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  court_type TEXT NOT NULL,
  booking_type TEXT NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  booking_date TIMESTAMPTZ DEFAULT NOW(),
  play_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  total_hours NUMERIC NOT NULL,
  rate_per_hour NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  advance_amount NUMERIC DEFAULT 0,
  advance_method TEXT,
  cash_paid NUMERIC DEFAULT 0,
  gpay_paid NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('paid', 'advance_received', 'pending', 'cancelled', 'monthly_subscriber')),
  notes TEXT,
  cancellation_reason TEXT,
  refund_amount NUMERIC DEFAULT 0,
  cancellation_charge NUMERIC DEFAULT 0,
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_by_name TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Drinks Sales Table
CREATE TABLE IF NOT EXISTS public.drink_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES public.shifts(id),
  booking_id UUID REFERENCES public.bookings(id),
  drink_type TEXT NOT NULL,
  drink_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  staff_id UUID REFERENCES public.profiles(id),
  staff_name TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES public.shifts(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  staff_id UUID REFERENCES public.profiles(id),
  staff_name TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Monthly Subscriptions Table
CREATE TABLE IF NOT EXISTS public.monthly_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  court_type TEXT NOT NULL,
  days_of_week INT[] NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  monthly_amount NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  previous_value TEXT,
  new_value TEXT,
  device TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR STAFF & OWNER

-- Authenticated Users can read profiles
CREATE POLICY "Read profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owner manage profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Shifts
CREATE POLICY "View shifts" ON public.shifts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff insert shifts" ON public.shifts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Staff update own shift" ON public.shifts FOR UPDATE USING (
  staff_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Bookings
CREATE POLICY "Read bookings" ON public.bookings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update bookings" ON public.bookings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Soft delete bookings (Owner Only)" ON public.bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Drinks & Expenses
CREATE POLICY "Read drinks" ON public.drink_sales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Insert drinks" ON public.drink_sales FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Read expenses" ON public.expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Insert expenses" ON public.expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Settings & Activity Logs (Owner full, Staff read settings)
CREATE POLICY "Read settings" ON public.settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owner update settings" ON public.settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Activity logs owner view" ON public.activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Activity logs insert" ON public.activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable Supabase Realtime WebSockets for all core tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings, public.shifts, public.drink_sales, public.expenses, public.monthly_subscriptions, public.profiles, public.settings;
