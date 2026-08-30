/* eslint-disable @next/next/no-img-element */
'use client';

import {
  Bell,
  Check,
  Checks,
  Flame,
  ShieldChevron,
  Sword,
  Trophy,
  UsersThree,
  X,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface NotificationItem {
  id: string | number;
  type: 'friend_request' | 'challenge_invite' | 'rival_lead' | 'challenge_won' | 'rank_up' | string;
  read_at: string | null;
  created_at: string;
  payload: {
    title: string;
    message: string;
    actor_name?: string;
    actor_tag?: string;
    actor_avatar?: string;
    link?: string;
    time_ago?: string;
  };
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'retos' | 'amigos'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones de Supabase
  useEffect(() => {
    let isMounted = true;

    async function fetchNotifications() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && isMounted) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setNotifications(data as any);
      }
    }

    void fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  async function handleMarkAllRead() {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', userData.user.id)
      .is('read_at', null);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
    );
  }

  async function handleMarkSingleRead(id: string | number) {
    const supabase = getSupabaseClient();
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', Number(id));

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  }

  async function handleDismiss(id: string | number) {
    const supabase = getSupabaseClient();
    await supabase.from('notifications').delete().eq('id', Number(id));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'retos') {
      return (
        n.type === 'challenge_invite' ||
        n.type === 'rival_lead' ||
        n.type === 'challenge_won'
      );
    }
    if (activeFilter === 'amigos') {
      return n.type === 'friend_request';
    }
    return true;
  });

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button
        className="icon-button notification-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ver notificaciones"
        aria-expanded={isOpen}
      >
        <Bell size={20} weight={unreadCount > 0 ? 'fill' : 'bold'} />
        {unreadCount > 0 ? <span className="notification-dot" /> : null}
      </button>

      {isOpen ? (
        <div
          className="panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 'min(90vw, 380px)',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: 0,
            zIndex: 999,
            boxShadow: '6px 6px 0 var(--line)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Cabecera del Panel */}
          <div
            style={{
              padding: '14px 18px',
              background: 'var(--surface-alt)',
              borderBottom: '3px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} weight="fill" color="var(--accent-bright)" />
              <strong style={{ font: '900 13px/1 var(--font-display)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Notificaciones
              </strong>
              {unreadCount > 0 ? (
                <span
                  style={{
                    font: '800 10px/1 var(--font-mono)',
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                    padding: '3px 7px',
                    border: '1px solid var(--line)',
                  }}
                >
                  {unreadCount} nuevas
                </span>
              ) : null}
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  font: '700 10px var(--font-mono)',
                  textTransform: 'uppercase',
                }}
                title="Marcar todas como leídas"
              >
                <Checks size={14} weight="bold" />
                <span>Leídas</span>
              </button>
            ) : null}
          </div>

          {/* Filtros rápidos */}
          <div style={{ padding: '8px 14px', borderBottom: '2px solid var(--line)', display: 'flex', gap: '6px', background: 'var(--bg)' }}>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              style={{
                border: '1px solid var(--line)',
                background: activeFilter === 'all' ? 'var(--ink)' : 'var(--surface)',
                color: activeFilter === 'all' ? 'var(--surface)' : 'var(--ink)',
                font: '800 10px var(--font-mono)',
                textTransform: 'uppercase',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('retos')}
              style={{
                border: '1px solid var(--line)',
                background: activeFilter === 'retos' ? 'var(--ink)' : 'var(--surface)',
                color: activeFilter === 'retos' ? 'var(--surface)' : 'var(--ink)',
                font: '800 10px var(--font-mono)',
                textTransform: 'uppercase',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Retos
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('amigos')}
              style={{
                border: '1px solid var(--line)',
                background: activeFilter === 'amigos' ? 'var(--ink)' : 'var(--surface)',
                color: activeFilter === 'amigos' ? 'var(--surface)' : 'var(--ink)',
                font: '800 10px var(--font-mono)',
                textTransform: 'uppercase',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Amigos
            </button>
          </div>

          {/* Lista de Notificaciones */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                <Check size={28} weight="bold" style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
                <p style={{ font: '800 12px var(--font-mono)', margin: 0 }}>No hay notificaciones en esta sección</p>
              </div>
            ) : (
              filtered.map((item) => {
                const isUnread = !item.read_at;
                const p = item.payload;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '2px solid var(--line)',
                      background: isUnread
                        ? 'color-mix(in oklch, var(--accent) 9%, var(--surface))'
                        : 'var(--surface)',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      transition: 'background-color 140ms ease',
                    }}
                  >
                    {/* Icono o Avatar de la Notificación */}
                    <div
                      style={{
                        position: 'relative',
                        width: '36px',
                        height: '36px',
                        flexShrink: 0,
                        border: '2px solid var(--line)',
                        background: 'var(--surface-alt)',
                        display: 'grid',
                        placeItems: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {p.actor_avatar ? (
                        <img src={p.actor_avatar} alt="" width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : item.type === 'challenge_invite' ? (
                        <Sword size={20} weight="fill" color="var(--accent-bright)" />
                      ) : item.type === 'rival_lead' ? (
                        <Flame size={20} weight="fill" color="var(--accent-bright)" />
                      ) : item.type === 'challenge_won' ? (
                        <Trophy size={20} weight="fill" color="#ffd700" />
                      ) : item.type === 'friend_request' ? (
                        <UsersThree size={20} weight="fill" color="var(--accent-bright)" />
                      ) : (
                        <ShieldChevron size={20} weight="fill" />
                      )}
                    </div>

                    {/* Contenido de la Notificación */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <strong
                          style={{
                            font: '900 12px/1.2 var(--font-display)',
                            textTransform: 'uppercase',
                            color: isUnread ? 'var(--accent-bright)' : 'var(--ink)',
                            display: 'block',
                          }}
                        >
                          {p.title}
                        </strong>
                        <small style={{ font: '700 9px var(--font-mono)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {p.time_ago || 'Reciente'}
                        </small>
                      </div>

                      <p style={{ margin: '4px 0 8px', font: '600 12px/1.35 var(--font-sans)', color: 'var(--ink)' }}>
                        {p.message}
                      </p>

                      {/* Acciones de la Notificación */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {p.link ? (
                          <Link
                            href={p.link}
                            onClick={() => {
                              void handleMarkSingleRead(item.id);
                              setIsOpen(false);
                            }}
                            className="secondary-button"
                            style={{
                              minHeight: '28px',
                              padding: '0 10px',
                              fontSize: '10px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                            }}
                          >
                            <span>
                              {item.type === 'friend_request'
                                ? 'Ver en Amigos'
                                : item.type === 'challenge_invite'
                                  ? 'Aceptar / Ver Reto'
                                  : item.type === 'rival_lead'
                                    ? 'Ver Versus'
                                    : 'Ver Detalle'}
                            </span>
                          </Link>
                        ) : null}

                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => void handleMarkSingleRead(item.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--muted)',
                              font: '700 9px var(--font-mono)',
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Marcar como leída"
                          >
                            <Check size={12} weight="bold" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Botón de descartar */}
                    <button
                      type="button"
                      onClick={() => void handleDismiss(item.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        opacity: 0.6,
                      }}
                      title="Descartar notificación"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer del Popover */}
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--surface-alt)',
              borderTop: '2px solid var(--line)',
              textAlign: 'center',
            }}
          >
            <Link
              href="/retos"
              onClick={() => setIsOpen(false)}
              style={{
                font: '800 10px/1 var(--font-mono)',
                color: 'var(--ink)',
                textTransform: 'uppercase',
                textDecoration: 'none',
                letterSpacing: '.05em',
              }}
            >
              Ver centro de duelos y actividad →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
