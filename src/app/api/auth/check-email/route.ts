import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ exists: false, email });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (error) {
      console.error('Error listing users in check-email:', error);
      return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
    }

    const exists = Boolean(
      data?.users?.some((u) => u.email && u.email.trim().toLowerCase() === email),
    );

    return NextResponse.json({ exists, email });
  } catch (err) {
    console.error('Exception in check-email route:', err);
    return NextResponse.json({ exists: false, error: 'Error verificando correo' }, { status: 500 });
  }
}
