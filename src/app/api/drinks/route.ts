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

    const formatted = items.map((d: any) => {
      let id = isUUID(d.id) ? d.id : crypto.randomUUID();
      while (usedIds.has(id)) id = crypto.randomUUID();
      usedIds.add(id);

      const shift_id = isUUID(d.shift_id) ? d.shift_id : null;
      const booking_id = isUUID(d.booking_id) ? d.booking_id : null;
      const staff_id = isUUID(d.staff_id) ? d.staff_id : null;

      return {
        id,
        shift_id,
        booking_id,
        drink_type: d.drink_type || 'normal_soda',
        drink_name: d.drink_name || 'Soda',
        quantity: Number(d.quantity) || 1,
        unit_price: Number(d.unit_price) || 10,
        total_price: Number(d.total_price) || 10,
        payment_method: d.payment_method || 'cash',
        staff_id,
        staff_name: d.staff_name || 'staff',
        is_paid: d.is_paid !== undefined ? Boolean(d.is_paid) : true,
        is_deleted: Boolean(d.is_deleted),
      };
    });

    // Extract unique shift_ids and ensure they exist in shifts table to satisfy FK constraint
    const shiftIds = Array.from(new Set(formatted.map((d: any) => d.shift_id).filter(Boolean)));
    if (shiftIds.length > 0) {
      const shiftRows = shiftIds.map((sid) => ({
        id: sid,
        staff_name: 'admin',
        opening_cash: 0,
        status: 'active',
      }));
      await supabaseAdmin.from('shifts').upsert(shiftRows, { onConflict: 'id' });
    }

    let { data, error } = await supabaseAdmin
      .from('drink_sales')
      .upsert(formatted, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase API drink_sales upsert error:', error);
      if (error.message && error.message.includes('is_paid')) {
        const fallbackFormatted = formatted.map(({ is_paid, ...rest }: any) => rest);
        const retryRes = await supabaseAdmin
          .from('drink_sales')
          .upsert(fallbackFormatted, { onConflict: 'id' })
          .select();

        if (!retryRes.error) {
          return NextResponse.json({ success: true, count: retryRes.data?.length || 0, data: retryRes.data });
        }
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('drink_sales').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
