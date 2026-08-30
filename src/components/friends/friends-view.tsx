'use client';

import {
  Check,
  Clock,
  MagnifyingGlass,
  Trash,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersThree,
  Warning,
  X,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/shared/app-sidebar';
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

interface SearchUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  friendshipStatus?: 'accepted' | 'pending_sent' | 'pending_received' | 'none';
  friendshipId?: number;
}

export function FriendsView() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent'>('friends');
  const [friendships, setFriendships] = useState<FriendshipItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const loadFriendships = useCallback(async (userId: string) => {
    const supabase = getSupabaseClient();

    // Consultar amistades donde el usuario sea requester o addressee
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

  // Buscar usuarios
  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!searchQuery.trim() || !currentUserId) return;

    setSearching(true);
    setActionFeedback(null);
    const supabase = getSupabaseClient();

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .neq('id', currentUserId)
      .ilike('display_name', `%${searchQuery.trim()}%`)
      .limit(8);

    if (error || !users) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    // Mapear con estado de amistad existente
    const mapped: SearchUser[] = users.map((u) => {
      const existing = friendships.find((f) => f.friend.id === u.id);
      let status: SearchUser['friendshipStatus'] = 'none';

      if (existing) {
        if (existing.status === 'accepted') status = 'accepted';
        else if (existing.isSender) status = 'pending_sent';
        else status = 'pending_received';
      }

      return {
        id: u.id,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        friendshipStatus: status,
        friendshipId: existing?.id,
      };
    });

    setSearchResults(mapped);
    setSearching(false);
  }

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
    setSearchResults((prev) =>
      prev.map((u) => (u.id === targetUserId ? { ...u, friendshipStatus: 'pending_sent' } : u)),
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

        {/* Buscador de Invocadores */}
        <section className="form-section" style={{ marginBottom: '28px' }}>
          <div className="form-section-heading">
            <span><MagnifyingGlass size={20} weight="bold" /></span>
            <div>
              <h3>Buscar invocadores</h3>
              <p>Encuentra a otros jugadores por su nombre de usuario para agregarlos a tu círculo.</p>
            </div>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder="Nombre de usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '49px',
                  border: '2px solid var(--line)',
                  background: 'var(--bg)',
                  padding: '0 14px',
                  font: '700 14px var(--font-sans)',
                  color: 'var(--ink)',
                }}
              />
            </div>
            <button
              type="submit"
              className="create-button"
              style={{ margin: 0, padding: '0 24px', minHeight: '49px' }}
              disabled={searching}
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {/* Resultados de Búsqueda */}
          {searchResults.length > 0 ? (
            <div style={{ marginTop: '20px', borderTop: '2px solid var(--line)', paddingTop: '16px' }}>
              <p className="eyebrow" style={{ marginBottom: '12px' }}>Resultados de la búsqueda ({searchResults.length})</p>
              <div style={{ display: 'grid', gap: '10px' }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '2px solid var(--line)',
                      background: 'var(--surface-alt)',
                      gap: '14px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="avatar avatar-small" style={{ width: '38px', height: '38px' }}>
                        {user.displayName.slice(0, 2).toUpperCase()}
                      </span>
                      <strong style={{ font: '800 16px/1 var(--font-display)', textTransform: 'uppercase' }}>
                        {user.displayName}
                      </strong>
                    </div>

                    <div>
                      {user.friendshipStatus === 'accepted' ? (
                        <span className="profile-badge profile-badge-accent">
                          <Check size={14} weight="bold" /> Amigos
                        </span>
                      ) : user.friendshipStatus === 'pending_sent' ? (
                        <span className="profile-badge">
                          <Clock size={14} weight="bold" /> Solicitud enviada
                        </span>
                      ) : user.friendshipStatus === 'pending_received' ? (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ minHeight: '36px', fontSize: '12px', padding: '0 12px' }}
                          onClick={() => user.friendshipId && acceptFriendRequest(user.friendshipId)}
                        >
                          Aceptar solicitud
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="create-challenge-submit"
                          style={{ margin: 0, minHeight: '38px', padding: '0 16px', fontSize: '13px' }}
                          onClick={() => sendFriendRequest(user.id)}
                        >
                          <UserPlus size={16} weight="bold" />
                          <span>Añadir amigo</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
      </main>
    </div>
  );
}
