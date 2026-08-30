'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, ShieldCheck } from '@phosphor-icons/react';

export function TermsView() {
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
            <span className="section-index"><FileText size={24} weight="bold" /></span>
            <p className="eyebrow" style={{ margin: 0 }}>Marco Legal y Condiciones</p>
          </div>
          <h1 style={{ font: '900 clamp(32px, 6vw, 48px)/1 var(--font-display)', textTransform: 'uppercase', margin: 0 }}>
            Términos de Servicio
          </h1>
          <p style={{ color: 'var(--muted)', font: '700 12px var(--font-mono)', marginTop: '8px' }}>
            Última actualización: Agosto 2026 · Proyecto desarrollado por Jackson Ocaña
          </p>
        </header>

        <div style={{ display: 'grid', gap: '28px' }}>
          {/* Disclaimer Oficial de Riot Games */}
          <section
            className="panel"
            style={{
              padding: '24px',
              border: '3px solid var(--line)',
              background: 'var(--surface-alt)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <ShieldCheck size={24} weight="bold" style={{ color: 'var(--accent-bright)' }} />
              <h2 style={{ font: '900 16px/1 var(--font-display)', textTransform: 'uppercase', margin: 0 }}>
                Aviso Legal de Riot Games (Legal Jibber Jabber)
              </h2>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
              &ldquo;LeagueOfFriends no está respaldado por Riot Games y no refleja los puntos de vista ni las opiniones de
              Riot Games ni de ninguna persona involucrada oficialmente en la producción o gestión de las propiedades de
              Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas comerciales
              registradas de Riot Games, Inc.&rdquo;
            </p>
          </section>

          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              1. Naturaleza y Propósito del Proyecto
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: 0 }}>
              LeagueOfFriends es una plataforma sin fines de lucro desarrollada por <strong>Jackson Ocaña</strong> como un proyecto de portafolio personal y herramienta comunitaria de seguimiento de estadísticas, duelos y retos competitivos entre amigos para el videojuego League of Legends.
            </p>
          </section>

          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              2. Consumo de la API Oficial de Riot Games
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: '0 0 12px' }}>
              Todas las estadísticas de partidas, rangos, puntos de liga (LP), victorias, derrotas y niveles de maestría son obtenidos de forma pública y no modificable a través de las APIs oficiales de Riot Games (Account-V1, Summoner-V4, League-V4 y Champion-Mastery-V4).
            </p>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: 0 }}>
              LeagueOfFriends no garantiza la disponibilidad ininterrumpida de los servidores de Riot Games ni se hace responsable por periodos de mantenimiento en los servidores del juego.
            </p>
          </section>

          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              3. Uso Aceptable y Cuentas de Usuario
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: '0 0 12px' }}>
              Al registrarte en LeagueOfFriends, te comprometes a:
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8', margin: 0 }}>
              <li>Proporcionar un correo electrónico válido para la gestión y recuperación de tu cuenta.</li>
              <li>No utilizar nombres de retos o mensajes ofensivos, discriminatorios o que violen las normas de convivencia.</li>
              <li>No intentar vulnerar, sobrecargar o realizar ataques de denegación de servicio a la plataforma.</li>
            </ul>
          </section>

          <section className="panel" style={{ padding: '28px', border: '2px solid var(--line)', background: 'var(--surface)' }}>
            <h2 style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', marginBottom: '14px' }}>
              4. Exención de Responsabilidad
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)', margin: 0 }}>
              El servicio se proporciona &ldquo;tal cual&rdquo; (as-is) sin garantías de ningún tipo. Los creadores y desarrolladores no asumen responsabilidad alguna por pérdidas de datos, discrepancias de estadísticas derivadas de la API externa o cualquier daño indirecto relacionado con el uso del sitio.
            </p>
          </section>
        </div>

        <footer style={{ marginTop: '48px', paddingTop: '24px', borderTop: '2px solid var(--line)', textAlign: 'center' }}>
          <p style={{ font: '700 12px var(--font-mono)', color: 'var(--muted)', margin: '0 0 8px' }}>
            Desarrollado con dedicación por <strong>Jackson Ocaña</strong> · Proyecto de Portafolio
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', font: '700 11px var(--font-mono)' }}>
            <Link href="/privacidad" style={{ color: 'var(--accent-bright)', textDecoration: 'underline' }}>
              Política de Privacidad
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
