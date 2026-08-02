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

function getStableUUID(str: string): string {
  if (typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  const h = crypto.createHash('md5').update(String(str || 'default')).digest('hex');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const formatted = items.map((b: any) => {
      const id = getStableUUID(b.id || `${b.team_name}-${b.play_date}-${b.start_time}`);
      const shift_id = b.shift_id ? getStableUUID(b.shift_id) : null;
      const created_by_user_id = b.created_by_user_id ? getStableUUID(b.created_by_user_id) : null;

      return {
        id,
        shift_id,
        team_name: b.team_name || 'Team',
        customer_name: b.customer_name || b.team_name || 'Customer',
        phone: b.phone || '',
        court_type: b.court_type || 'football',
        booking_type: b.booking_type || 'football',
        source: b.source || 'walk_in',
        reference_id: b.reference_id || null,
        booking_date: b.booking_date || new Date().toISOString(),
        play_date: b.play_date || new Date().toISOString().split('T')[0],
        start_time: b.start_time || '07:00',
        end_time: b.end_time || '08:00',
        total_hours: Number(b.total_hours) || 1,
        rate_per_hour: Number(b.rate_per_hour) || 600,
        total_price: Number(b.total_price) || 600,
        discount: Number(b.discount) || 0,
        final_amount: Number(b.final_amount) || 600,
        advance_amount: Number(b.advance_amount) || 0,
        advance_method: b.advance_method || null,
        cash_paid: Number(b.cash_paid) || 0,
        gpay_paid: Number(b.gpay_paid) || 0,
        outstanding_balance: Number(b.outstanding_balance) || 0,
        pending_amount: Number(b.pending_amount) || 0,
        is_pos_confirmed: Boolean(b.is_pos_confirmed),
        payment_records: Array.isArray(b.payment_records) ? b.payment_records : [],
        status: b.status || 'pending',
        notes: b.notes || null,
        cancellation_reason: b.cancellation_reason || null,
        refund_amount: Number(b.refund_amount) || 0,
        cancellation_charge: Number(b.cancellation_charge) || 0,
        created_by_user_id,
        created_by_name: b.created_by_name || 'admin',
        is_deleted: Boolean(b.is_deleted),
      };
    });

    // Extract unique shift_ids and ensure they exist in shifts table to satisfy FK constraint
    const shiftIds = Array.from(new Set(formatted.map((b: any) => b.shift_id).filter(Boolean)));
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
      .from('bookings')
      .upsert(formatted, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase API bookings upsert error:', error);
      if (error.message && error.message.includes('payment_records')) {
        const fallbackFormatted = formatted.map(({ payment_records, ...rest }: any) => rest);
        const retryRes = await supabaseAdmin
          .from('bookings')
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
    console.error('API bookings route error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('bookings').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('bookings').delete().eq('id', id);
    if (error) {
      console.error('Supabase API bookings delete error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
