import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const isUUID = (str: string) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];
    const usedIds = new Set<string>();

    const formatted = items.map((sub: any) => {
      let id = isUUID(sub.id) ? sub.id : crypto.randomUUID();
      while (usedIds.has(id)) id = crypto.randomUUID();
      usedIds.add(id);

      return {
        id,
        team_name: sub.team_name || 'Team',
        customer_name: sub.customer_name || 'Customer',
        phone: sub.phone || '',
        court_type: sub.court_type || 'football',
        days_of_week: Array.isArray(sub.days_of_week) ? sub.days_of_week : [1, 3, 5],
        start_time: sub.start_time || '18:00',
        end_time: sub.end_time || '19:00',
        monthly_amount: Number(sub.monthly_amount) || 0,
        start_date: sub.start_date || new Date().toISOString().split('T')[0],
        end_date: sub.end_date || new Date().toISOString().split('T')[0],
        status: sub.status || 'active',
        notes: sub.notes || null,
      };
    });

    const { data, error } = await supabaseAdmin
      .from('monthly_subscriptions')
      .upsert(formatted, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase API monthly_subscriptions upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('monthly_subscriptions').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
