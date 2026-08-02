import { DrinkItem, DrinkType, Settings, UserProfile } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
  facility_name: 'Orion Turf',
  phone: '+91 98765 43210',
  address: 'Kochi Sports Hub, Main Road, Kerala',
  football_morning_rate: 600,
  football_night_rate: 1000,
  football_night_start_hour: 19, // 7 PM onwards is Night Rate (6 PM - 7 PM is Day Rate ₹600)
  badminton_synthetic_rate: 350,
  badminton_wooden_rate: 400,
  drink_prices: {
    normal_soda: 10,
    mint_soda: 12,
    color_soda: 12,
    jeera_soda: 12,
  },
  expense_categories: [
    'Drinks',
    'Electricity',
    'Cleaning',
    'Maintenance',
    'Equipment',
    'Staff Tea',
    'Salary',
    'Shuttle',
    'Miscellaneous',
  ],
};

export const DRINK_ITEMS: DrinkItem[] = [
  { id: 'normal_soda', name: 'Normal Soda', category: 'normal', price: 10 },
  { id: 'mint_soda', name: 'Mint Soda', category: 'special', price: 12 },
  { id: 'color_soda', name: 'Color Soda', category: 'special', price: 12 },
  { id: 'jeera_soda', name: 'Jeera Soda', category: 'special', price: 12 },
];

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'user-owner-1',
    email: 'owner@turfarena.com',
    full_name: 'Rahul Varma (Owner)',
    role: 'owner',
    is_active: true,
    phone: '+91 98765 00001',
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-staff-1',
    email: 'staff@turfarena.com',
    full_name: 'Anil Kumar (Staff)',
    role: 'staff',
    is_active: true,
    phone: '+91 98765 00002',
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-staff-2',
    email: 'midhun@turfarena.com',
    full_name: 'Midhun Joy (Staff)',
    role: 'staff',
    is_active: true,
    phone: '+91 98765 00003',
    created_at: new Date().toISOString(),
  },
];

export const TIME_SLOTS = [
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
];
