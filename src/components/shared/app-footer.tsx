import Link from 'next/link';
import { Heart } from '@phosphor-icons/react';

export function AppFooter() {
  return (
    <footer
      style={{
        marginTop: '64px',
        padding: '32px 0 24px',
        borderTop: '2px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div style={{ maxWidth: '780px', fontSize: '11px', lineHeight: '1.6', color: 'var(--muted)' }}>
        &ldquo;LeagueOfFriends no está respaldado por Riot Games y no refleja los puntos de vista ni las opiniones de Riot
        Games ni de ninguna persona involucrada oficialmente en la producción o gestión de las propiedades de Riot Games.
        Riot Games y todas las propiedades asociadas son marcas comerciales o marcas comerciales registradas de Riot
        Games, Inc.&rdquo;
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          font: '800 12px/1 var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <span>Desarrollado con</span>
        <Heart size={15} weight="fill" style={{ color: 'var(--accent-bright)' }} />
        <span>por</span>
        <a
          href="https://github.com/jacksonandresrosales"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--ink)',
            textDecoration: 'underline',
            fontWeight: '900',
          }}
        >
          Jackson Ocaña
        </a>
      </div>

      <div style={{ display: 'flex', gap: '16px', font: '700 11px var(--font-mono)', color: 'var(--muted)' }}>
        <Link href="/terminos" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Términos de Servicio
        </Link>
        <span>·</span>
        <Link href="/privacidad" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Política de Privacidad
        </Link>
        <span>·</span>
        <a
          href="https://github.com/jacksonandresrosales/LeagueOfFriends"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          GitHub Portfolio
        </a>
      </div>
    </footer>
  );
}
