import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support single profile or array of profiles
    const profiles = Array.isArray(body) ? body : [body];

    const isUUID = (str: string) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const usedIds = new Set<string>();

    const formatted = profiles.map((p: any) => {
      let id = isUUID(p.id) ? p.id : crypto.randomUUID();
      while (usedIds.has(id)) {
        id = crypto.randomUUID();
      }
      usedIds.add(id);

      return {
        id,
        email: p.email || '',
        full_name: p.full_name || p.name || 'Staff User',
        role: p.role || 'staff',
        phone: p.phone || '',
        password: p.password || 'staff123',
      };
    });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(formatted, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase API staff upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (err: any) {
    console.error('API staff route error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('*');
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
