import { NextRequest, NextResponse } from 'next/server';
import { getResendClient } from '@/lib/email/client';
import { getPasswordResetEmailHtml } from '@/lib/email/templates';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Por favor, ingresa un correo electrónico válido.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Generar OTP de recuperación nativo en Supabase Auth
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (linkError || !linkData?.properties?.email_otp) {
      // Por seguridad, responder de forma genérica o amigable
      return NextResponse.json({
        ok: true,
        message: 'Si el correo está registrado, recibirás un código de verificación en breve.',
      });
    }

    const otpCode = linkData.properties.email_otp;

    // 2. Enviar correo mediante Resend
    const resend = getResendClient();

    // En plan dev de Resend, enviamos a jacksonandresrosales@gmail.com o al email si es el mismo
    // o al email del usuario cuando esté en producción con dominio verificado.
    const { error: resendError } = await resend.emails.send({
      from: 'LeagueOfFriends <onboarding@resend.dev>',
      to: email,
      subject: `Código de verificación: ${otpCode} — LeagueOfFriends`,
      html: getPasswordResetEmailHtml(otpCode),
    });

    if (resendError) {
      return NextResponse.json(
        { error: 'No se pudo enviar el correo de verificación. Intenta más tarde.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Código de verificación enviado a tu correo.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Error procesando la solicitud de recuperación.' },
      { status: 500 },
    );
  }
}
