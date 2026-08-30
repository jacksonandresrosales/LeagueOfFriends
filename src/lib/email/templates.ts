export function getPasswordResetEmailHtml(otpCode: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Código de recuperación — LeagueOfFriends</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f4f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111111;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 3px solid #111111; box-shadow: 6px 6px 0px #111111; padding: 36px 32px;">
    
    <!-- Brand Header -->
    <div style="background-color: #9b111e; border: 2px solid #111111; padding: 12px 16px; margin-bottom: 28px;">
      <span style="color: #ffffff; font-family: monospace; font-size: 14px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
        LEAGUE OF FRIENDS
      </span>
    </div>

    <!-- Main Message -->
    <h1 style="font-size: 26px; line-height: 1.1; font-weight: 900; text-transform: uppercase; margin: 0 0 16px; letter-spacing: -0.5px;">
      Recuperación de Contraseña
    </h1>

    <p style="font-size: 15px; line-height: 1.5; color: #333333; margin: 0 0 24px;">
      Has solicitado restablecer la contraseña de tu cuenta. Usa el siguiente código de verificación para continuar con el proceso:
    </p>

    <!-- OTP Code Display -->
    <div style="background-color: #f8f8f6; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111; padding: 24px; text-align: center; margin: 28px 0;">
      <span style="display: block; font-family: monospace; font-size: 12px; font-weight: 800; color: #666666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
        Tu código de verificación
      </span>
      <strong style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #9b111e; display: inline-block;">
        ${otpCode}
      </strong>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #666666; margin: 0 0 28px;">
      Este código es válido por <strong>15 minutos</strong>. Si tú no solicitaste este cambio, puedes ignorar este correo; tu cuenta permanece segura.
    </p>

    <!-- Footer -->
    <div style="border-top: 2px solid #111111; padding-top: 18px; margin-top: 28px;">
      <p style="font-family: monospace; font-size: 11px; color: #888888; margin: 0; text-transform: uppercase;">
        LeagueOfFriends · Compite con tu círculo cercano.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}
