'use client';

import Link from 'next/link';
import { ArrowLeft, LockKey } from '@phosphor-icons/react';

export function PrivacyView() {
  return (
    <div className="auth-page" style={{ gridTemplateColumns: '1fr', minHeight: '100vh', background: 'var(--bg)' }}>
      <main style={{ maxWidth: '840px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <header style={{ marginBottom: '32px' }}>
          <Link
            href="/"
            className="secondary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '24px' }}
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Volver a LeagueOfFriends</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span className="section-index"><LockKey size={24} weight="bold" /></span>
            <p className="eyebrow" style={{ margin: 0 }}>Privacidad y Protección de Datos</p>
          </div>
          <h1 style={{ font: '900 clamp(32px, 6vw, 48px)/1 var(--font-display)', textTransform: 'uppercase', margin: 0 }}>
            Política de Privacidad
          </h1>
          <p style={{ color: 'var(--muted)', font: '700 12px var(--font-mono)', marginTop: '8px' }}>
            Última actualización: Agosto 2026 · Desarrollado por Jackson Ocaña
          </p>
        </header>

        <div style={{ display: 'grid', gap: '28px' }}>
          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              1. Principio Fundamental
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: 0 }}>
              En <strong>LeagueOfFriends</strong> (desarrollado por <strong>Jackson Ocaña</strong>), tu privacidad es una prioridad absoluta. <strong>No vendemos, no comercializamos ni compartimos tus datos con terceros para fines publicitarios.</strong> Solo recopilamos los datos estrictamente necesarios para ofrecerte las funciones competitivas y de seguimiento de partidas.
            </p>
          </section>

          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              2. ¿Qué Datos Recopilamos?
            </h2>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8', margin: 0 }}>
              <li>
                <strong>Correo Electrónico:</strong> Utilizado únicamente para identificar tu cuenta y enviarte códigos de seguridad de un solo uso (OTP) para recuperación de contraseña.
              </li>
              <li>
                <strong>Contraseña:</strong> Se procesa de forma segura mediante <code>bcrypt</code> con Salt criptográfico. Tu contraseña nunca se almacena en texto plano ni es visible para nadie.
              </li>
              <li>
                <strong>Riot ID y Estadísticas Públicas:</strong> Tu nombre de invocador (<code>GameName #TagLine</code>), PUUID, nivel, rango y victorias, obtenidos directamente de la API pública de Riot Games.
              </li>
              <li>
                <strong>Actividad en la App:</strong> Retos creados, solicitudes de amistad aceptadas y notificaciones dentro de la plataforma.
              </li>
            </ul>
          </section>

          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              3. Uso de Cookies y Almacenamiento Local
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: '0 0 12px' }}>
              Utilizamos <strong>únicamente cookies y almacenamiento local de tipo técnico y de sesión</strong>:
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8', margin: 0 }}>
              <li>Token de sesión JWT (para mantener tu inicio de sesión activo).</li>
              <li>Preferencia de tema visual (modo claro u oscuro).</li>
            </ul>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--muted)', fontStyle: 'italic', marginTop: '12px' }}>
              No utilizamos Google Analytics, píxeles de Facebook ni ningún rastreador publicitario de terceros.
            </p>
          </section>

          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              4. Proveedores de Infraestructura
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: '0 0 12px' }}>
              Para operar de forma segura y eficiente, utilizamos los siguientes servicios:
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8', margin: 0 }}>
              <li><strong>Supabase:</strong> Base de datos Postgres en la nube con Row Level Security (RLS) y autenticación segura.</li>
              <li><strong>Resend:</strong> Envío de correos transaccionales para códigos de recuperación de cuenta.</li>
              <li><strong>Riot Games API:</strong> Sincronización de estadísticas de invocador.</li>
            </ul>
          </section>

          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              5. Derechos de los Usuarios (GDPR / Supresión de Datos)
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: 0 }}>
              Tienes derecho a solicitar la consulta, modificación o eliminación definitiva de tu cuenta y de todos los registros asociados en cualquier momento contactando directamente a través de nuestro repositorio oficial de GitHub.
            </p>
          </section>
        </div>

        <footer style={{ marginTop: '48px', paddingTop: '24px', borderTop: '2px solid var(--line)', textAlign: 'center' }}>
          <p style={{ font: '700 12px var(--font-mono)', color: 'var(--muted)', margin: '0 0 8px' }}>
            Desarrollado con dedicación por <strong>Jackson Ocaña</strong> · Proyecto de Portafolio
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', font: '700 11px var(--font-mono)' }}>
            <Link href="/terminos" style={{ color: 'var(--accent-bright)', textDecoration: 'underline' }}>
              Términos de Servicio & Disclaimer
            </Link>
            <span>·</span>
            <a
              href="https://github.com/jacksonandresrosales"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--ink)', textDecoration: 'underline' }}
            >
              GitHub de Jackson Ocaña
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
