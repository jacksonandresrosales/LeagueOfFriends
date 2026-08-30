import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const password = String(body.password || '');

    if (!email || !code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Por favor, ingresa un código de verificación de 6 dígitos válido.' },
        { status: 400 },
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Validar el código de 6 dígitos en la base de datos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: record, error: fetchError } = await (supabaseAdmin as any)
      .from('recovery_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !record) {
      return NextResponse.json(
        { error: 'El código de verificación es incorrecto o ha expirado.' },
        { status: 400 },
      );
    }

    // 2. Buscar al usuario por correo
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json(
        { error: 'Error al consultar la cuenta de usuario.' },
        { status: 500 },
      );
    }

    const user = usersData.users.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      return NextResponse.json(
        { error: 'No se encontró ninguna cuenta asociada a este correo.' },
        { status: 404 },
      );
    }

    // 3. Actualizar la contraseña del usuario en Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.' },
        { status: 500 },
      );
    }

    // 4. Eliminar el código de recuperación usado
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from('recovery_codes').delete().eq('email', email);

    return NextResponse.json({
      ok: true,
      message: 'Tu contraseña ha sido actualizada con éxito.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Error procesando el restablecimiento de contraseña.' },
      { status: 500 },
    );
  }
}
