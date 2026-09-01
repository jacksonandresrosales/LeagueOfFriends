/* eslint-disable @next/next/no-img-element */
'use client';

import {
  CalendarBlank,
  Check,
  Crosshair,
  EnvelopeSimple,
  FlagCheckered,
  MagnifyingGlass,
  Plus,
  ShieldChevron,
  Spinner,
  Sword,
  Trophy,
  X,
} from '@phosphor-icons/react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppFooter } from '@/components/shared/app-footer';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { AppTopbar } from '@/components/shared/app-topbar';
import { getSupabaseClient } from '@/lib/supabase/client';

type ChallengeType = 'lp' | 'rank' | 'wins';

interface FriendCandidate {
  id: string;
  name: string;
  tag: string;
  initials: string;
  profileIconUrl?: string;
  riotAccountId?: number;
}

const challengeTypes = [
  { id: 'lp' as const, title: 'Ganar LP', description: 'Gana la mayor cantidad de LP', icon: Trophy, unit: 'LP', defaultGoal: 100 },
  { id: 'rank' as const, title: 'Subir de rango', description: 'El primero en llegar al objetivo', icon: ShieldChevron, unit: 'Tier', defaultGoal: 1 },
  { id: 'wins' as const, title: 'Sumar victorias', description: 'Consigue más partidas ganadas', icon: FlagCheckered, unit: 'Victorias', defaultGoal: 20 },
];

export function CreateChallenge() {
  const router = useRouter();
  const [type, setType] = useState<ChallengeType>('lp');
  const [challengeName, setChallengeName] = useState('Carrera a Esmeralda IV');
  const [goal, setGoal] = useState<number>(100);
  const [duration, setDuration] = useState<number>(30);
  const [targetRank, setTargetRank] = useState('EMERALD_IV');
  const [reward, setReward] = useState('Título de Campeón del Círculo + Honor');
  const [notifications, setNotifications] = useState(true);

  // Amigos reales de Supabase
  const [friendsList, setFriendsList] = useState<FriendCandidate[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  // Modal / Buscador Riot ID
  const [showRiotSearch, setShowRiotSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<FriendCandidate | null>(null);
  const [searchError, setSearchError] = useState('');

  // Estado de guardado
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cargar amigos reales de Supabase
  useEffect(() => {
    async function loadRealFriends() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) return;
      const currentUserId = userData.user.id;

      const { data: friendships } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url),
          addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      if (friendships && friendships.length > 0) {
        const loaded: FriendCandidate[] = [];

        for (const f of friendships) {
          const isSender = f.requester_id === currentUserId;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const friendProfile = isSender ? (f.addressee as any) : (f.requester as any);
          if (!friendProfile) continue;

          const { data: riotAcc } = await supabase
            .from('riot_accounts')
            .select('*')
            .eq('profile_id', friendProfile.id)
            .eq('is_primary', true)
            .maybeSingle();

          const name = riotAcc?.game_name || friendProfile.display_name || 'Invocador';
          const tag = riotAcc ? `#${riotAcc.tag_line}` : '#LAN';

          loaded.push({
            id: friendProfile.id,
            name,
            tag,
            initials: name.slice(0, 2).toUpperCase(),
            profileIconUrl: friendProfile.avatar_url || 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/5466.png',
            riotAccountId: riotAcc?.id,
          });
        }

        setFriendsList(loaded);
        if (loaded.length > 0) {
          setSelectedFriendIds([loaded[0].id]);
        }
      }
    }

    void loadRealFriends();
  }, []);

  function toggleFriend(id: string) {
    setSelectedFriendIds((current) =>
      current.includes(id) ? current.filter((fId) => fId !== id) : [...current, id],
    );
  }

  // Buscar invocador por Riot ID
  async function handleSearchRiotId() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.user) {
        setSearchError(data.error || 'No encontramos un invocador con ese Riot ID.');
        setSearching(false);
        return;
      }

      const u = data.user;
      const candidate: FriendCandidate = {
        id: u.id,
        name: u.game_name || u.display_name,
        tag: `#${u.tag_line}`,
        initials: (u.game_name || u.display_name).slice(0, 2).toUpperCase(),
        profileIconUrl: u.profile_icon_url,
        riotAccountId: u.riot_account_id,
      };

      setSearchResult(candidate);
    } catch {
      setSearchError('Error al consultar el Riot ID en los servidores.');
    } finally {
      setSearching(false);
    }
  }

  function handleAddFoundCandidate() {
    if (!searchResult) return;

    if (!friendsList.some((f) => f.id === searchResult.id)) {
      setFriendsList((prev) => [searchResult, ...prev]);
    }
    if (!selectedFriendIds.includes(searchResult.id)) {
      setSelectedFriendIds((prev) => [...prev, searchResult.id]);
    }

    setShowRiotSearch(false);
    setSearchQuery('');
    setSearchResult(null);
  }

  // Submit y Guardado en Supabase
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (selectedFriendIds.length === 0) {
      setErrorMsg('Debes seleccionar al menos a un rival para el reto.');
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseClient();

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setErrorMsg('Debes iniciar sesión para crear un reto.');
        setSubmitting(false);
        return;
      }

      const currentUserId = userData.user.id;

      // Obtener cuenta de Riot del creador
      const { data: myRiotAccount } = await supabase
        .from('riot_accounts')
        .select('*')
        .eq('profile_id', currentUserId)
        .eq('is_primary', true)
        .maybeSingle();

      const now = new Date();
      const endsAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

      // 1. Insertar el reto en public.challenges
      const targetTier = type === 'rank' ? targetRank.split('_')[0] : null;
      const targetDiv = type === 'rank' ? targetRank.split('_')[1] || 'IV' : null;
      const finalTargetValue = type === 'lp' || type === 'wins' ? goal : 100;

      const { data: newChallenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          creator_id: currentUserId,
          name: challengeName.trim(),
          metric: type,
          status: 'active',
          queue_type: 'RANKED_SOLO_5x5',
          target_value: finalTargetValue,
          target_tier: targetTier,
          target_division: targetDiv,
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          rules: {
            reward: reward.trim(),
            duration_days: duration,
            notifications_enabled: notifications,
          },
        })
        .select()
        .single();

      if (challengeError || !newChallenge) {
        throw new Error(challengeError?.message || 'No se pudo crear el reto.');
      }

      // 2. Insertar al creador como participante
      if (myRiotAccount) {
        await supabase.from('challenge_participants').insert({
          challenge_id: newChallenge.id,
          profile_id: currentUserId,
          riot_account_id: myRiotAccount.id,
          role: 'creator',
          status: 'accepted',
          baseline_value: 0,
          current_value: 0,
          joined_at: now.toISOString(),
        });
      }

      // 3. Insertar a los amigos invitados y enviar notificaciones
      for (const friendId of selectedFriendIds) {
        const friend = friendsList.find((f) => f.id === friendId);
        if (!friend) continue;

        // Si es un amigo registrado en base de datos
        if (!friendId.endsWith('-mock')) {
          if (friend.riotAccountId) {
            await supabase.from('challenge_participants').insert({
              challenge_id: newChallenge.id,
              profile_id: friend.id,
              riot_account_id: friend.riotAccountId,
              role: 'participant',
              status: 'invited',
              baseline_value: 0,
              current_value: 0,
            });
          }

          // Crear notificación en Supabase para el rival
          await supabase.from('notifications').insert({
            profile_id: friend.id,
            type: 'challenge_invite',
            challenge_id: newChallenge.id,
            deduplication_key: `challenge-invite-${newChallenge.id}-${friend.id}`,
            payload: {
              title: 'Nuevo Reto Recibido',
              message: `¡Te han desafiado al reto '${challengeName.trim()}'!`,
              actor_name: myRiotAccount?.game_name || 'Tu amigo',
              actor_tag: myRiotAccount ? `#${myRiotAccount.tag_line}` : '#LAN',
              actor_avatar: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/5466.png',
              link: `/retos?challengeId=${newChallenge.id}`,
            },
          });
        }
      }

      setSuccessMsg('¡Reto creado con éxito! Redirigiendo a la lista de retos...');
      setTimeout(() => {
        router.push(`/retos?challengeId=${newChallenge.id}`);
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al crear el reto.');
      setSubmitting(false);
    }
  }

  const selectedType = challengeTypes.find((item) => item.id === type) ?? challengeTypes[0];

  return (
    <div className="app-shell">
      <AppSidebar active="Retos" />
      <main className="dashboard-main challenge-create-main">
        <AppTopbar category="Retos / Nuevo" title="Crear un reto" />

        <div className="challenge-intro">
          <div>
            <span className="section-index"><Sword size={24} weight="bold" /></span>
            <h2>Pon una meta.<br />Que empiece la carrera.</h2>
          </div>
          <p>Define una regla clara, invita a tu círculo y compararemos el progreso de todos en tiempo real desde el mismo punto de partida.</p>
        </div>

        <div className="challenge-steps" aria-label="Pasos para crear el reto">
          <span className="is-current"><b>01</b> Detalles</span>
          <span className="is-current"><b>02</b> Rivales</span>
          <span className="is-current"><b>03</b> Confirmar</span>
        </div>

        {errorMsg ? (
          <div className="auth-error" style={{ marginBottom: '20px' }} role="alert">
            <X size={18} weight="bold" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {successMsg ? (
          <div className="auth-feedback" style={{ marginBottom: '20px' }} role="status">
            <Check size={18} weight="bold" />
            <span>{successMsg}</span>
          </div>
        ) : null}

        <form className="challenge-builder" onSubmit={handleSubmit}>
          <div className="challenge-form-column">
            <section className="form-section" aria-labelledby="details-title">
              <div className="form-section-heading">
                <span>01</span>
                <div>
                  <h3 id="details-title">Define la competencia</h3>
                  <p>Elige qué dato decidirá quién gana el duelo.</p>
                </div>
              </div>

              <label className="field-group">
                <span className="field-label">Nombre del reto</span>
                <input
                  name="name"
                  type="text"
                  value={challengeName}
                  maxLength={48}
                  required
                  onChange={(e) => setChallengeName(e.target.value)}
                />
                <small>Máximo 48 caracteres</small>
              </label>

              <div className="field-group">
                <span className="field-label">Tipo de objetivo</span>
                <div className="challenge-type-grid" role="group" aria-label="Tipo de objetivo">
                  {challengeTypes.map(({ id, title, description, icon: Icon, defaultGoal }) => (
                    <button
                      key={id}
                      type="button"
                      className={type === id ? 'challenge-type is-selected' : 'challenge-type'}
                      onClick={() => {
                        setType(id);
                        setGoal(defaultGoal);
                      }}
                      aria-pressed={type === id}
                    >
                      <Icon size={25} weight={type === id ? 'fill' : 'bold'} />
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </button>
                  ))}
                </div>
              </div>

              {type === 'rank' ? (
                <div className="field-row">
                  <label className="field-group">
                    <span className="field-label">Rango Objetivo</span>
                    <select
                      value={targetRank}
                      onChange={(e) => setTargetRank(e.target.value)}
                    >
                      <option value="EMERALD_IV">Esmeralda IV</option>
                      <option value="DIAMOND_IV">Diamante IV</option>
                      <option value="PLATINUM_IV">Platino IV</option>
                      <option value="GOLD_IV">Oro IV</option>
                      <option value="MASTER_I">Master</option>
                    </select>
                  </label>
                  <label className="field-group">
                    <span className="field-label">Duración</span>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    >
                      <option value="7">7 días</option>
                      <option value="14">14 días</option>
                      <option value="30">30 días</option>
                      <option value="60">60 días</option>
                    </select>
                  </label>
                </div>
              ) : (
                <div className="field-row">
                  <label className="field-group">
                    <span className="field-label">Meta</span>
                    <div className="input-with-suffix">
                      <input
                        name="goal"
                        type="number"
                        min="1"
                        value={goal}
                        onChange={(e) => setGoal(Number(e.target.value))}
                        required
                      />
                      <span>{selectedType.unit}</span>
                    </div>
                  </label>
                  <label className="field-group">
                    <span className="field-label">Duración</span>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    >
                      <option value="7">7 días</option>
                      <option value="14">14 días</option>
                      <option value="30">30 días</option>
                      <option value="60">60 días</option>
                    </select>
                  </label>
                </div>
              )}

              <label className="field-group">
                <span className="field-label">Recompensa / Apuesta</span>
                <input
                  name="reward"
                  type="text"
                  value={reward}
                  maxLength={64}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="Ej. Título de Campeón, Cena pagada..."
                />
              </label>

              <div className="date-note">
                <CalendarBlank size={22} weight="bold" />
                <span>
                  <strong>DURACIÓN: {duration} DÍAS</strong>
                  <small>El seguimiento comenzará en vivo al crear el reto.</small>
                </span>
              </div>
            </section>

            <section className="form-section" aria-labelledby="friends-title">
              <div className="form-section-heading">
                <span>02</span>
                <div>
                  <h3 id="friends-title">Elige a tus rivales</h3>
                  <p>Selecciona amigos de tu círculo o invita por Riot ID.</p>
                </div>
              </div>

              {friendsList.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    border: '2px dashed var(--line)',
                    background: 'var(--surface-alt)',
                    textAlign: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <p style={{ margin: '0 0 6px', font: '700 12px var(--font-mono)', color: 'var(--muted)' }}>
                    Aún no tienes amigos en tu círculo.
                  </p>
                  <p style={{ margin: 0, font: '700 11px var(--font-mono)' }}>
                    Puedes invitar a tus rivales buscando su Riot ID abajo o agregarlos en Amigos.
                  </p>
                </div>
              ) : (
                <div className="friend-picker">
                  {friendsList.map((friend) => {
                    const selected = selectedFriendIds.includes(friend.id);
                    return (
                      <label key={friend.id} className={selected ? 'friend-option is-selected' : 'friend-option'}>
                        <input type="checkbox" checked={selected} onChange={() => toggleFriend(friend.id)} />
                        <div className="friend-option-info">
                          {friend.profileIconUrl ? (
                            <div className="friend-option-avatar">
                              <img src={friend.profileIconUrl} alt="" width={40} height={40} />
                            </div>
                          ) : (
                            <span className="avatar avatar-small">{friend.initials}</span>
                          )}
                          <div className="friend-option-names">
                            <strong>{friend.name}</strong>
                            <small>{friend.tag}</small>
                          </div>
                        </div>
                        <span className="selection-box">{selected ? <Check size={16} weight="bold" /> : null}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Botón y Panel para Invitar por Riot ID */}
              {!showRiotSearch ? (
                <button
                  type="button"
                  className="invite-button"
                  onClick={() => setShowRiotSearch(true)}
                >
                  <EnvelopeSimple size={19} weight="bold" />
                  <span>Invitar por Riot ID</span>
                </button>
              ) : (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: 'var(--surface-alt)',
                    border: '2px solid var(--line)',
                    boxShadow: '3px 3px 0 var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong style={{ font: '900 12px/1 var(--font-display)', textTransform: 'uppercase' }}>
                      Buscar Invocador en Riot Games
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowRiotSearch(false)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ej. Invocador#LAN"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSearchRiotId();
                        }
                      }}
                      style={{
                        flex: 1,
                        height: '42px',
                        border: '2px solid var(--line)',
                        padding: '0 12px',
                        font: '800 12px var(--font-mono)',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSearchRiotId}
                      disabled={searching || !searchQuery.trim()}
                      className="create-button"
                      style={{ minHeight: '42px', margin: 0, padding: '0 14px', fontSize: '11px' }}
                    >
                      {searching ? <Spinner size={16} className="animate-spin" /> : <MagnifyingGlass size={16} weight="bold" />}
                      <span>Buscar</span>
                    </button>
                  </div>

                  {searchError ? (
                    <p style={{ margin: '8px 0 0', color: 'var(--accent-bright)', font: '700 11px var(--font-mono)' }}>
                      {searchError}
                    </p>
                  ) : null}

                  {searchResult ? (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        border: '2px solid var(--line)',
                        background: 'var(--surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="avatar avatar-small">{searchResult.initials}</span>
                        <div>
                          <strong style={{ font: '900 13px/1 var(--font-display)', textTransform: 'uppercase' }}>
                            {searchResult.name}
                          </strong>
                          <small style={{ font: '700 10px var(--font-mono)', color: 'var(--muted)', display: 'block' }}>
                            {searchResult.tag}
                          </small>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddFoundCandidate}
                        className="create-button"
                        style={{ minHeight: '32px', margin: 0, padding: '0 12px', fontSize: '10px' }}
                      >
                        <Plus size={14} weight="bold" />
                        <span>Añadir al Reto</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="form-section compact-form-section" aria-labelledby="rules-title">
              <div className="form-section-heading">
                <span>03</span>
                <div>
                  <h3 id="rules-title">Avisos y reglas</h3>
                  <p>Todos compiten bajo las mismas condiciones.</p>
                </div>
              </div>
              <label className="toggle-row">
                <span>
                  <strong>Solo clasificatoria Solo/Duo</strong>
                  <small>No contará Flex ni partidas normales.</small>
                </span>
                <input type="checkbox" defaultChecked />
                <i aria-hidden="true" />
              </label>
              <label className="toggle-row">
                <span>
                  <strong>Avisarme cuando me superen en LP</strong>
                  <small>Recibirás una alerta en tu centro de notificaciones.</small>
                </span>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(event) => setNotifications(event.target.checked)}
                />
                <i aria-hidden="true" />
              </label>
            </section>
          </div>

          <aside className="challenge-summary" aria-labelledby="summary-title">
            <div className="summary-header">
              <Crosshair size={34} weight="bold" />
              <div>
                <span>Vista previa</span>
                <h3 id="summary-title">{challengeName}</h3>
              </div>
            </div>

            <dl className="summary-data">
              <div>
                <dt>Objetivo</dt>
                <dd>{selectedType.title}</dd>
              </div>
              <div>
                <dt>Meta</dt>
                <dd>{type === 'rank' ? targetRank.replace('_', ' ') : `${goal} ${selectedType.unit}`}</dd>
              </div>
              <div>
                <dt>Duración</dt>
                <dd>{duration} días</dd>
              </div>
              <div>
                <dt>Jugadores</dt>
                <dd>{selectedFriendIds.length + 1} en total</dd>
              </div>
            </dl>

            <div className="summary-racers">
              <span className="avatar avatar-red">TÚ</span>
              {friendsList
                .filter((friend) => selectedFriendIds.includes(friend.id))
                .map((friend) => (
                  <span className="avatar" key={friend.id} title={friend.name}>
                    {friend.initials}
                  </span>
                ))}
              <span className="racer-count">+{selectedFriendIds.length} rivales</span>
            </div>

            <div className="summary-rule">
              <Sword size={20} weight="bold" />
              <p>
                <strong>Punto de partida justo</strong>
                <span>Registraremos el LP de cada jugador en vivo al aceptar el reto.</span>
              </p>
            </div>

            {notifications ? (
              <div className="summary-rule">
                <EnvelopeSimple size={20} weight="bold" />
                <p>
                  <strong>Alertas activadas</strong>
                  <span>Te notificaremos en la campana si alguien toma la delantera.</span>
                </p>
              </div>
            ) : null}

            <button
              className="create-challenge-submit"
              type="submit"
              disabled={submitting || selectedFriendIds.length === 0}
            >
              {submitting ? (
                <>
                  <Spinner size={20} className="animate-spin" />
                  <span>Creando Reto...</span>
                </>
              ) : (
                <>
                  <FlagCheckered size={20} weight="fill" />
                  <span>Crear reto</span>
                </>
              )}
            </button>
            <p className="summary-footnote">Las invitaciones y notificaciones se enviarán al confirmar.</p>
          </aside>
        </form>
        <AppFooter />
      </main>
    </div>
  );
}
