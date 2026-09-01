export function getPasswordResetEmailHtml(otpCode: string): string {
  const digits = otpCode.split('');

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Código de Seguridad — LeagueOfFriends</title>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=JetBrains+Mono:wght@700;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #08090d; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e6eb;">
  
  <!-- Preheader Hidden Text for Email Clients -->
  <div style="display: none; font-size: 1px; color: #08090d; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Tu código de verificación de 6 dígitos es: ${otpCode}. Válido durante 15 minutos.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #08090d; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px 50px;">
        
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #0f1118; border: 2px solid #232738; box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(230, 57, 70, 0.2); border-radius: 4px; overflow: hidden;">
          
          <!-- Top Accent Color Bar (Crimson & Gold Riot Style) -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #e63946 0%, #c8aa6e 50%, #e63946 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- Header Section with Brand -->
          <tr>
            <td style="padding: 36px 36px 24px; text-align: center; border-bottom: 1px solid #1c2030;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Brand Badge -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #e63946; border: 2px solid #ffffff; padding: 6px 12px; box-shadow: 3px 3px 0 #000000;">
                          <span style="font-family: 'Cinzel', Georgia, serif; font-size: 16px; font-weight: 900; color: #ffffff; letter-spacing: 2px;">
                            LF
                          </span>
                        </td>
                        <td style="padding-left: 10px; text-align: left;">
                          <span style="font-family: 'Cinzel', Georgia, serif; font-size: 14px; font-weight: 900; color: #ffffff; letter-spacing: 2.5px; display: block; line-height: 1.1;">
                            LEAGUE
                          </span>
                          <span style="font-family: 'Cinzel', Georgia, serif; font-size: 11px; font-weight: 700; color: #c8aa6e; letter-spacing: 2.5px; display: block; line-height: 1.1;">
                            OF FRIENDS
                          </span>
                        </td>
                      </tr>
                    </table>

                    <div style="font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11px; font-weight: 700; color: #e63946; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">
                      ⚡ CENTRO DE SEGURIDAD
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 36px 20px;">
              <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.25; text-align: center;">
                Recupera tu acceso
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9aa0b4; text-align: center;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código de un solo uso para verificar tu identidad:
              </p>

              <!-- OTP Code Display Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0; background-color: #07080b; border: 2px solid #e63946; border-radius: 4px; box-shadow: 0 0 20px rgba(230, 57, 70, 0.15), 4px 4px 0 #000000;">
                <tr>
                  <td style="padding: 24px 16px; text-align: center;">
                    <div style="font-family: 'JetBrains Mono', Consolas, monospace; font-size: 10px; font-weight: 800; color: #8289a0; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px;">
                      CÓDIGO DE VERIFICACIÓN (6 DÍGITOS)
                    </div>

                    <!-- Digits Grid -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                      <tr>
                        ${digits
                          .map(
                            (digit) => `
                        <td style="padding: 0 4px;">
                          <div style="width: 44px; height: 54px; line-height: 54px; text-align: center; background-color: #141722; border: 2px solid #2f354d; border-radius: 3px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 28px; font-weight: 900; color: #ffffff; box-shadow: 2px 2px 0 #000000;">
                            ${digit}
                          </div>
                        </td>
                        `,
                          )
                          .join('')}
                      </tr>
                    </table>

                    <div style="font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11px; color: #c8aa6e; margin-top: 14px; font-weight: 700;">
                      ⏱️ Expira en 15 minutos
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Banner -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #131620; border-left: 3px solid #c8aa6e; border-radius: 0 4px 4px 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a4abbd;">
                      <strong style="color: #ffffff;">🔒 Nota de seguridad:</strong> Ningún miembro del equipo te pedirá este código. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: #6b7280; text-align: center;">
                Si tienes problemas, ingresa a la plataforma y solicita un nuevo código.
              </p>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding: 24px 36px 30px; background-color: #0a0b10; border-top: 1px solid #1c2030; text-align: center;">
              <p style="margin: 0 0 8px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11px; font-weight: 700; color: #8289a0; text-transform: uppercase; letter-spacing: 0.5px;">
                Desarrollado con ❤️ por <span style="color: #ffffff;">Jackson Ocaña</span>
              </p>
              
              <p style="margin: 0 0 12px; font-size: 11px; color: #4e5569; line-height: 1.4;">
                LeagueOfFriends no está respaldado por Riot Games y no refleja los puntos de vista ni las opiniones de Riot Games ni de ninguna persona involucrada oficialmente en la producción o gestión de League of Legends.
              </p>

              <div style="font-family: 'JetBrains Mono', Consolas, monospace; font-size: 10px; color: #6b7280;">
                LeagueOfFriends · Compite con amigos en la Grieta del Invocador
              </div>
            </td>
          </tr>

        </table>
        <!-- End Main Card -->

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getSignupConfirmationEmailHtml(confirmationUrl: string): string {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Confirma tu Cuenta — LeagueOfFriends</title>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=JetBrains+Mono:wght@700;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #08090d; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e6eb;">
  
  <div style="display: none; font-size: 1px; color: #08090d; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ¡Bienvenido a LeagueOfFriends! Confirma tu correo para activar tu cuenta de invocador.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #08090d; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px 50px;">
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #0f1118; border: 2px solid #232738; box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(230, 57, 70, 0.2); border-radius: 4px; overflow: hidden;">
          
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #e63946 0%, #c8aa6e 50%, #e63946 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding: 36px 36px 24px; text-align: center; border-bottom: 1px solid #1c2030;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #e63946; border: 2px solid #ffffff; padding: 6px 12px; box-shadow: 3px 3px 0 #000000;">
                          <span style="font-family: 'Cinzel', Georgia, serif; font-size: 16px; font-weight: 900; color: #ffffff; letter-spacing: 2px;">
                            LF
                          </span>
                        </td>
                        <td style="padding-left: 10px; text-align: left;">
                          <span style="font-family: 'Cinzel', Georgia, serif; font-size: 14px; font-weight: 900; color: #ffffff; letter-spacing: 2.5px; display: block; line-height: 1.1;">
                            LEAGUE
                          </span>
                          <span style="font-family: 'Cinzel', Georgia, serif; font-size: 11px; font-weight: 700; color: #c8aa6e; letter-spacing: 2.5px; display: block; line-height: 1.1;">
                            OF FRIENDS
                          </span>
                        </td>
                      </tr>
                    </table>

                    <div style="font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11px; font-weight: 700; color: #10b981; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">
                      ✓ ACTIVACIÓN DE CUENTA
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 36px 24px;">
              <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.25; text-align: center;">
                ¡Bienvenido a la Grieta!
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9aa0b4; text-align: center;">
                Gracias por registrarte en LeagueOfFriends. Haz clic en el siguiente botón para confirmar tu dirección de correo y activar tu perfil:
              </p>

              <!-- CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: #e63946; border: 2px solid #ffffff; box-shadow: 4px 4px 0 #000000;">
                          <a href="${confirmationUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: 'Cinzel', Georgia, serif; font-size: 14px; font-weight: 900; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px;">
                            CONFIRMAR MI CUENTA
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 12px; font-size: 12px; line-height: 1.5; color: #6b7280; text-align: center;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0 0 20px; font-family: 'JetBrains Mono', monospace; font-size: 11px; word-break: break-all; color: #c8aa6e; text-align: center;">
                <a href="${confirmationUrl}" style="color: #c8aa6e; text-decoration: underline;">${confirmationUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px 30px; background-color: #0a0b10; border-top: 1px solid #1c2030; text-align: center;">
              <p style="margin: 0 0 8px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11px; font-weight: 700; color: #8289a0; text-transform: uppercase; letter-spacing: 0.5px;">
                Desarrollado con ❤️ por <span style="color: #ffffff;">Jackson Ocaña</span>
              </p>
              
              <p style="margin: 0 0 12px; font-size: 11px; color: #4e5569; line-height: 1.4;">
                LeagueOfFriends no está respaldado por Riot Games.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
