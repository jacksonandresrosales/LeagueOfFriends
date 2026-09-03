import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const rawDisplayName = String(body.displayName || '').trim();

    if (!rawDisplayName || rawDisplayName.length < 3) {
      return NextResponse.json(
        { error: 'El nombre de invocador debe tener al menos 3 caracteres.' },
        { status: 400 },
      );
    }

    if (rawDisplayName.length > 16) {
      return NextResponse.json(
        { error: 'El nombre de invocador no puede exceder 16 caracteres.' },
        { status: 400 },
      );
    }

    const safeDisplayName = rawDisplayName.slice(0, 16);

    if (!email || !email.includes('@') || email.length < 5) {
      return NextResponse.json(
        { error: 'Ingresa un correo electrónico válido.' },
        { status: 400 },
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Verificar si el correo ya está registrado
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (!listError && usersData?.users) {
      const alreadyExists = usersData.users.some(
        (u) => u.email && u.email.trim().toLowerCase() === email,
      );
      if (alreadyExists) {
        return NextResponse.json(
          { error: 'Este correo ya está registrado. Inicia sesión para continuar.' },
          { status: 400 },
        );
      }
    }

    // 2. Crear usuario confirmado directamente en Supabase Auth
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        displayName: safeDisplayName,
      },
    });

    if (createError) {
      console.error('Error al crear usuario en Supabase Admin:', createError);
      if (
        createError.message?.toLowerCase().includes('already registered') ||
        createError.message?.toLowerCase().includes('user already exists')
      ) {
        return NextResponse.json(
          { error: 'Este correo ya está registrado. Inicia sesión para continuar.' },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: createError.message || 'No fue posible crear la cuenta en este momento.' },
        { status: 500 },
      );
    }

    const user = createData.user;
    if (user) {
      // 3. Asegurar la creación del perfil en la tabla profiles
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        display_name: safeDisplayName,
      });

      if (profileError) {
        console.error('Error al crear perfil en tabla profiles:', profileError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada exitosamente.',
      user: {
        id: user?.id,
        email: user?.email,
        displayName: safeDisplayName,
      },
    });
  } catch (err) {
    console.error('Excepción en /api/auth/register:', err);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al procesar el registro.' },
      { status: 500 },
    );
  }
}
