import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const settingsData = {
      id: 1,
      facility_name: body.facility_name || 'TurfArena Sports Complex',
      phone: body.phone || '+91 98765 43210',
      address: body.address || 'Kochi Sports Hub, Kerala',
      football_morning_rate: Number(body.football_morning_rate) || 600,
      football_night_rate: Number(body.football_night_rate) || 1000,
      football_night_start_hour: Number(body.football_night_start_hour) || 18,
      badminton_synthetic_rate: Number(body.badminton_synthetic_rate) || 350,
      badminton_wooden_rate: Number(body.badminton_wooden_rate) || 400,
      drink_prices: body.drink_prices || {
        normal_soda: 10,
        mint_soda: 12,
        color_soda: 12,
        jeera_soda: 12,
      },
      expense_categories: body.expense_categories || [
        'Electricity',
        'Cleaning',
        'Maintenance',
        'Equipment',
        'Staff Tea',
        'Salary',
        'Shuttle',
        'Miscellaneous',
      ],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('settings')
      .upsert(settingsData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase API settings upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('settings').select('*').single();
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: data || null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
