'use client';

import {
  Check,
  Clock,
  MagnifyingGlass,
  Spinner,
  Trash,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersThree,
  Warning,
  X,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AppFooter } from '@/components/shared/app-footer';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { NotificationBell } from '@/components/shared/notification-bell';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { getSupabaseClient } from '@/lib/supabase/client';

interface FriendshipItem {
  id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  createdAt: string;
  isSender: boolean;
  friend: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface SearchResultItem {
  id: string;
  displayName: string;
  gameName?: string;
  tagLine?: string;
  platform?: string;
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  friendshipId?: number;
}

export function FriendsView() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent'>('friends');
  const [friendships, setFriendships] = useState<FriendshipItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda en vivo (Live suggestions)
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const loadFriendships = useCallback(async (userId: string) => {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        requester_id,
        addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url),
        addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    const items: FriendshipItem[] = (data || []).map((row) => {
      const isSender = row.requester_id === userId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const friendData = isSender ? (row.addressee as any) : (row.requester as any);
      return {
        id: row.id,
        status: row.status as FriendshipItem['status'],
        createdAt: row.created_at,
        isSender,
        friend: {
          id: friendData?.id || (isSender ? row.addressee_id : row.requester_id),
          displayName: friendData?.display_name || 'Invocador',
          avatarUrl: friendData?.avatar_url || null,
        },
      };
    });

    setFriendships(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
        void loadFriendships(data.user.id);
      } else {
        setLoading(false);
      }
    }

    void init();
  }, [loadFriendships]);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
    }
  }

  // Búsqueda en vivo tipo LeagueOfGraphs / OP.GG con debounce de 250ms
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setIsSearching(false);
        return;
      }

      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setSuggestions(json.results || []);
          setShowDropdown(true);
        }
      } catch {
        // Fallback silencioso
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Enviar solicitud de amistad
  async function sendFriendRequest(targetUserId: string) {
    if (!currentUserId) return;
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('friendships').insert({
      requester_id: currentUserId,
      addressee_id: targetUserId,
      status: 'pending',
    });

    if (error) {
      setActionFeedback({ message: 'No se pudo enviar la solicitud. Intenta de nuevo.', isError: true });
      return;
    }

    setActionFeedback({ message: '¡Solicitud de amistad enviada con éxito!' });
    void loadFriendships(currentUserId);
    setSuggestions((prev) =>
      prev.map((u) => (u.id === targetUserId ? { ...u, status: 'pending_sent' } : u)),
    );
  }

  // Aceptar solicitud
  async function acceptFriendRequest(friendshipId: number) {
    if (!currentUserId) return;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', friendshipId);

    if (error) {
      setActionFeedback({ message: 'Error al aceptar la solicitud.', isError: true });
      return;
    }

    setActionFeedback({ message: '¡Solicitud aceptada! Ahora están en el mismo círculo.' });
    void loadFriendships(currentUserId);
    setSuggestions((prev) =>
      prev.map((u) => (u.friendshipId === friendshipId ? { ...u, status: 'accepted' } : u)),
    );
  }

  // Rechazar o eliminar amistad
  async function removeOrRejectFriendship(friendshipId: number, message = 'Amistad eliminada.') {
    if (!currentUserId) return;
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

    if (error) {
      setActionFeedback({ message: 'No fue posible completar la acción.', isError: true });
      return;
    }

    setActionFeedback({ message });
    void loadFriendships(currentUserId);
    setSuggestions((prev) =>
      prev.map((u) => (u.friendshipId === friendshipId ? { ...u, status: 'none', friendshipId: undefined } : u)),
    );
  }

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
  const receivedRequests = friendships.filter((f) => f.status === 'pending' && !f.isSender);
  const sentRequests = friendships.filter((f) => f.status === 'pending' && f.isSender);

  return (
    <div className="app-shell" id="amigos">
      <AppSidebar active="Amigos" />
      <main className="dashboard-main challenge-create-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Círculo / Comunidad</p>
            <h1>Amigos</h1>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        <div className="challenge-intro">
          <div>
            <span className="section-index"><UsersThree size={24} weight="bold" /></span>
            <h2>Compite y compara<br />con tu círculo cercano.</h2>
          </div>
          <p>
            Agrega amigos a tu lista para comparar puntos de liga, participar en retos privados y ver quién lidera la clasificación.
          </p>
        </div>

        {/* Buscador de Invocadores con Sugerencias en Vivo (Live Autocomplete) */}
        <section className="form-section" style={{ marginBottom: '28px' }}>
          <div className="form-section-heading">
            <span><MagnifyingGlass size={20} weight="bold" /></span>
            <div>
              <h3>Buscar invocadores</h3>
              <p>Escribe el nombre de usuario o Riot ID para ver sugerencias en tiempo real.</p>
            </div>
          </div>

          <div ref={searchContainerRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Escribe un nombre de usuario o Riot ID (ej. jacksON...)"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                style={{
                  width: '100%',
                  height: '52px',
                  border: '2px solid var(--line)',
                  background: 'var(--bg)',
                  padding: '0 48px 0 16px',
                  font: '700 14px var(--font-sans)',
                  color: 'var(--ink)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '16px',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--muted)',
                }}
              >
                {isSearching ? (
                  <Spinner size={20} weight="bold" className="animate-spin" />
                ) : (
                  <MagnifyingGlass size={20} weight="bold" />
                )}
              </div>
            </div>

            {/* Dropdown de Sugerencias en Vivo */}
            {showDropdown ? (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  border: '3px solid var(--line)',
                  background: 'var(--surface)',
                  boxShadow: 'var(--hard-shadow)',
                  zIndex: 50,
                  maxHeight: '380px',
                  overflowY: 'auto',
                }}
              >
                {suggestions.length === 0 ? (
                  <div style={{ padding: '18px', textAlign: 'center', color: 'var(--muted)', font: '700 12px var(--font-mono)' }}>
                    NO SE ENCONTRARON INVOCADORES CON &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        padding: '10px 16px',
                        background: 'var(--surface-alt)',
                        borderBottom: '2px solid var(--line)',
                        font: '800 10px/1 var(--font-mono)',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        letterSpacing: '.08em',
                      }}
                    >
                      Sugerencias de invocadores ({suggestions.length})
                    </div>
                    {suggestions.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 18px',
                          borderBottom: '2px solid var(--line)',
                          gap: '14px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            className="avatar avatar-small"
                            style={{ width: '42px', height: '42px', fontSize: '15px' }}
                          >
                            {(item.gameName || item.displayName).slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <strong style={{ font: '900 17px/1 var(--font-display)', textTransform: 'uppercase', display: 'block' }}>
                              {item.gameName || item.displayName}
                            </strong>
                            <small style={{ color: 'var(--muted)', font: '700 10px/1.2 var(--font-mono)', textTransform: 'uppercase' }}>
                              {item.tagLine ? `#${item.tagLine}` : ''} {item.platform ? `(${item.platform})` : ''}
                            </small>
                          </div>
                        </div>

                        <div>
                          {item.status === 'accepted' ? (
                            <span className="profile-badge profile-badge-accent">
                              <Check size={14} weight="bold" /> Amigos
                            </span>
                          ) : item.status === 'pending_sent' ? (
                            <span className="profile-badge">
                              <Clock size={14} weight="bold" /> Solicitud enviada
                            </span>
                          ) : item.status === 'pending_received' ? (
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ minHeight: '36px', fontSize: '12px', padding: '0 14px' }}
                              onClick={() => item.friendshipId && acceptFriendRequest(item.friendshipId)}
                            >
                              Aceptar solicitud
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="create-challenge-submit"
                              style={{ margin: 0, minHeight: '36px', padding: '0 16px', fontSize: '12px', boxShadow: '3px 3px 0 var(--line)' }}
                              onClick={() => sendFriendRequest(item.id)}
                            >
                              <UserPlus size={16} weight="bold" />
                              <span>Añadir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {actionFeedback ? (
            <div
              className={`auth-feedback ${actionFeedback.isError ? 'is-error' : ''}`}
              role="alert"
              style={{ marginTop: '16px' }}
            >
              {actionFeedback.isError ? <Warning size={18} weight="bold" /> : <Check size={18} weight="bold" />}
              <span>{actionFeedback.message}</span>
            </div>
          ) : null}
        </section>

        {/* Pestañas de Gestión de Amigos */}
        <div className="neo-tabs" style={{ marginBottom: '24px' }}>
          <button
            type="button"
            className={activeTab === 'friends' ? 'is-active' : ''}
            onClick={() => setActiveTab('friends')}
          >
            Amigos ({acceptedFriends.length})
          </button>
          <button
            type="button"
            className={activeTab === 'received' ? 'is-active' : ''}
            onClick={() => setActiveTab('received')}
          >
            Recibidas ({receivedRequests.length})
          </button>
          <button
            type="button"
            className={activeTab === 'sent' ? 'is-active' : ''}
            onClick={() => setActiveTab('sent')}
          >
            Enviadas ({sentRequests.length})
          </button>
        </div>

        {/* Contenido según pestaña */}
        {loading ? (
          <p className="eyebrow">Cargando círculo de amigos...</p>
        ) : activeTab === 'friends' ? (
          acceptedFriends.length === 0 ? (
            <div
              className="panel"
              style={{
                padding: '36px',
                textAlign: 'center',
                background: 'var(--surface)',
                display: 'grid',
                placeItems: 'center',
                gap: '12px',
              }}
            >
              <UsersThree size={48} weight="bold" style={{ color: 'var(--muted)' }} />
              <strong style={{ font: '900 20px/1 var(--font-display)', textTransform: 'uppercase' }}>
                Aún no tienes amigos agregados
              </strong>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px', maxWidth: '400px' }}>
                Utiliza el buscador superior para encontrar a tus amigos e invitarlos a formar parte de tu círculo competitivo.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {acceptedFriends.map((item) => (
                <div
                  key={item.id}
                  className="panel"
                  style={{
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className="avatar avatar-small" style={{ width: '48px', height: '48px', fontSize: '16px' }}>
                      {item.friend.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong style={{ font: '900 20px/1 var(--font-display)', textTransform: 'uppercase', display: 'block' }}>
                        {item.friend.displayName}
                      </strong>
                      <small style={{ color: 'var(--muted)', font: '700 10px/1.4 var(--font-mono)', textTransform: 'uppercase' }}>
                        En tu círculo desde {new Date(item.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link
                      className="secondary-button"
                      href={`/comparar?friendId=${item.friend.id}`}
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Comparar</span>
                    </Link>
                    <button
                      type="button"
                      className="icon-button"
                      title="Eliminar de amigos"
                      aria-label="Eliminar amigo"
                      onClick={() => removeOrRejectFriendship(item.id, 'Amigo eliminado de tu lista.')}
                    >
                      <UserMinus size={18} weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'received' ? (
          receivedRequests.length === 0 ? (
            <div className="panel" style={{ padding: '36px', textAlign: 'center', background: 'var(--surface)' }}>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>No tienes solicitudes de amistad pendientes.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {receivedRequests.map((item) => (
                <div
                  key={item.id}
                  className="panel"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="avatar avatar-small" style={{ width: '42px', height: '42px' }}>
                      {item.friend.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', display: 'block' }}>
                        {item.friend.displayName}
                      </strong>
                      <small style={{ color: 'var(--muted)', font: '700 9px/1.2 var(--font-mono)', textTransform: 'uppercase' }}>
                        Quiere unirse a tu círculo
                      </small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="create-challenge-submit"
                      style={{ margin: 0, minHeight: '40px', padding: '0 16px', fontSize: '13px' }}
                      onClick={() => acceptFriendRequest(item.id)}
                    >
                      <UserCheck size={18} weight="bold" />
                      <span>Aceptar</span>
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Rechazar solicitud"
                      aria-label="Rechazar"
                      onClick={() => removeOrRejectFriendship(item.id, 'Solicitud rechazada.')}
                    >
                      <X size={18} weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          sentRequests.length === 0 ? (
            <div className="panel" style={{ padding: '36px', textAlign: 'center', background: 'var(--surface)' }}>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>No has enviado ninguna solicitud pendiente.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {sentRequests.map((item) => (
                <div
                  key={item.id}
                  className="panel"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="avatar avatar-small" style={{ width: '42px', height: '42px' }}>
                      {item.friend.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong style={{ font: '900 18px/1 var(--font-display)', textTransform: 'uppercase', display: 'block' }}>
                        {item.friend.displayName}
                      </strong>
                      <small style={{ color: 'var(--muted)', font: '700 9px/1.2 var(--font-mono)', textTransform: 'uppercase' }}>
                        Esperando respuesta...
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-button"
                    title="Cancelar solicitud"
                    aria-label="Cancelar solicitud"
                    onClick={() => removeOrRejectFriendship(item.id, 'Solicitud cancelada.')}
                  >
                    <Trash size={18} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
        <AppFooter />
      </main>
    </div>
  );
}
