import crypto from 'crypto';
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

    // 1. Generar código de 6 dígitos numéricos exactos (ej. 492810)
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 2. Guardar en la tabla recovery_codes (limpiando códigos previos del mismo correo)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recoveryTable = (supabaseAdmin as any).from('recovery_codes');
    await recoveryTable.delete().eq('email', email);
    const { error: insertError } = await recoveryTable.insert({
      email,
      code: otpCode,
      expires_at: expiresAt,
    });

    if (insertError) {
      return NextResponse.json(
        { error: 'Error al generar el código de recuperación.' },
        { status: 500 },
      );
    }

    // 3. Enviar correo mediante Resend
    const resend = getResendClient();

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
      message: 'Código de 6 dígitos enviado exitosamente a tu correo.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Error procesando la solicitud de recuperación.' },
      { status: 500 },
    );
  }
}
