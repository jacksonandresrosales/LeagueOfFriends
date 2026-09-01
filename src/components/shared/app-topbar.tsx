'use client';

import { GearSix, Plus, SignOut } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotificationBell } from '@/components/shared/notification-bell';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { getSupabaseClient } from '@/lib/supabase/client';

interface AppTopbarProps {
  category?: string;
  title: string;
  user?: {
    displayName?: string;
    tagLine?: string;
    avatarUrl?: string;
    initials?: string;
  };
}

export function AppTopbar({ category, title, user }: AppTopbarProps) {
  const router = useRouter();

  async function handleSignOut() {
    await getSupabaseClient().auth.signOut({ scope: 'local' });
    router.replace('/login');
  }

  return (
    <header className="topbar">
      <div className="topbar-title-wrap">
        {category ? <p className="eyebrow">{category}</p> : null}
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        {/* Crear Reto directo en móvil */}
        <Link
          href="/retos/nuevo"
          className="icon-button topbar-create-btn"
          title="Crear un nuevo reto"
          aria-label="Crear un nuevo reto"
        >
          <Plus size={20} weight="bold" />
        </Link>

        {/* Notificaciones */}
        <NotificationBell />

        {/* Cambio de Tema */}
        <ThemeToggle />

        {/* Configurar / Vincular Riot ID */}
        <Link
          href="/vincular-riot"
          className="icon-button topbar-gear-btn"
          title="Configurar / Vincular Riot Games"
          aria-label="Configurar y vincular cuenta de Riot Games"
        >
          <GearSix size={20} weight="bold" />
        </Link>

        {/* Botón Salir / Cerrar Sesión */}
        <button
          type="button"
          className="icon-button topbar-signout-btn"
          onClick={handleSignOut}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <SignOut size={20} weight="bold" />
        </button>

        {/* Mini perfil si está disponible */}
        {user?.displayName ? (
          <Link
            href="/vincular-riot"
            className="mini-profile"
            aria-label={`Perfil de ${user.displayName}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                width={38}
                height={38}
                style={{ border: '2px solid var(--line)', background: 'var(--surface)', flexShrink: 0 }}
              />
            ) : (
              <span className="avatar avatar-small">{user.initials || user.displayName.slice(0, 2).toUpperCase()}</span>
            )}
            <span className="mini-profile-text">
              <strong>{user.displayName}</strong>
              <small>{user.tagLine || '#LAN'}</small>
            </span>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
