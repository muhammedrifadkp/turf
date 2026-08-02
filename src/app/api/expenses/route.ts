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

    const formatted = items.map((e: any) => {
      let id = isUUID(e.id) ? e.id : crypto.randomUUID();
      while (usedIds.has(id)) id = crypto.randomUUID();
      usedIds.add(id);

      const shift_id = isUUID(e.shift_id) ? e.shift_id : null;
      const staff_id = isUUID(e.staff_id) ? e.staff_id : null;

      return {
        id,
        shift_id,
        category: e.category || 'Miscellaneous',
        description: e.description || '',
        amount: Number(e.amount) || 0,
        payment_method: e.payment_method || 'cash',
        staff_id,
        staff_name: e.staff_name || 'admin',
        is_deleted: Boolean(e.is_deleted),
      };
    });

    // Extract unique shift_ids and ensure they exist in shifts table to satisfy FK constraint
    const shiftIds = Array.from(new Set(formatted.map((e: any) => e.shift_id).filter(Boolean)));
    if (shiftIds.length > 0) {
      const shiftRows = shiftIds.map((sid) => ({
        id: sid,
        staff_name: 'admin',
        opening_cash: 0,
        status: 'active',
      }));
      await supabaseAdmin.from('shifts').upsert(shiftRows, { onConflict: 'id' });
    }

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .upsert(formatted, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase API expenses upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('expenses').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
