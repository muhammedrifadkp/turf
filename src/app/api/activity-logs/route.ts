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

    const formatted = items.map((l: any) => {
      let id = isUUID(l.id) ? l.id : crypto.randomUUID();
      while (usedIds.has(id)) id = crypto.randomUUID();
      usedIds.add(id);

      const user_id = isUUID(l.user_id) ? l.user_id : null;

      return {
        id,
        user_id,
        user_name: l.user_name || 'User',
        user_role: l.user_role || 'owner',
        action: l.action || '',
        entity_type: l.entity_type || 'booking',
        entity_id: l.entity_id || null,
        previous_value: l.previous_value || null,
        new_value: l.new_value || null,
        device: l.device || null,
      };
    });

    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .upsert(formatted, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase API activity_logs upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('activity_logs').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
