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

    const formatted = items.map((s: any) => {
      let id = isUUID(s.id) ? s.id : crypto.randomUUID();
      while (usedIds.has(id)) id = crypto.randomUUID();
      usedIds.add(id);

      const staff_id = isUUID(s.staff_id) ? s.staff_id : null;

      return {
        id,
        staff_id,
        staff_name: s.staff_name || 'admin',
        start_time: s.start_time || new Date().toISOString(),
        end_time: s.end_time || null,
        opening_cash: Number(s.opening_cash) || 0,
        closing_cash: s.closing_cash !== undefined && s.closing_cash !== null ? Number(s.closing_cash) : null,
        status: s.status || 'active',
        shift_notes: s.shift_notes || null,
      };
    });

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .upsert(formatted, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase API shifts upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('shifts').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
