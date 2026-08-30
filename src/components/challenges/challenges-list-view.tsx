/* eslint-disable @next/next/no-img-element */
'use client';

import {
  ArrowsLeftRight,
  Check,
  Clock,
  FlagCheckered,
  Flame,
  Plus,
  ShieldChevron,
  Sword,
  Trophy,
  X,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { NotificationBell } from '@/components/shared/notification-bell';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { getSupabaseClient } from '@/lib/supabase/client';

type TabType = 'active' | 'pending' | 'history';

interface ChallengeParticipant {
  id: string;
  displayName: string;
  tagLine: string;
  profileIconUrl?: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  isCurrentUser: boolean;
}

interface ChallengeItem {
  id: string;
  title: string;
  type: 'lp' | 'rank' | 'wins';
  status: 'active' | 'pending_acceptance' | 'completed';
  createdByMe: boolean;
  createdAt: string;
  endDate: string;
  daysRemaining: number;
  targetMetric: string;
  targetValue: number;
  reward?: string;
  participants: ChallengeParticipant[];
  winnerName?: string;
  winnerIsCurrentUser?: boolean;
}

export function ChallengesListView() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get('challengeId');

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        setLoading(false);
        return;
      }

      const currentUserId = userData.user.id;

      try {
        // Cargar retos donde el usuario es creador o participante
        const { data: dbChallenges } = await supabase
          .from('challenges')
          .select(`
            *,
            participants:challenge_participants(
              profile_id,
              role,
              status,
              baseline_value,
              current_value,
              profile:profiles(id, display_name, avatar_url),
              riot_account:riot_accounts(game_name, tag_line)
            )
          `)
          .order('created_at', { ascending: false });

        if (dbChallenges && dbChallenges.length > 0) {
          const mapped: ChallengeItem[] = dbChallenges.map((ch) => {
            const ends = new Date(ch.ends_at);
            const now = new Date();
            const diffDays = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const isCompleted = ch.status === 'completed' || diffDays === 0;
            const targetVal = ch.target_value || 100;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parts: ChallengeParticipant[] = (ch.participants || []).map((p: any) => {
              const name = p.riot_account?.game_name || p.profile?.display_name || 'Invocador';
              const tag = p.riot_account ? `#${p.riot_account.tag_line}` : '#LAN';
              const curVal = p.current_value || 0;
              const pct = targetVal > 0 ? Math.min(100, Math.round((curVal / targetVal) * 100)) : 0;

              return {
                id: p.profile_id,
                displayName: name,
                tagLine: tag,
                profileIconUrl: p.profile?.avatar_url || 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/5466.png',
                currentValue: curVal,
                targetValue: targetVal,
                percentage: pct,
                isCurrentUser: p.profile_id === currentUserId,
              };
            });

            // Si el creador no estaba en los participants mapeados, agregarlo
            if (parts.length === 0) {
              parts.push({
                id: currentUserId,
                displayName: 'Tú',
                tagLine: '#LAN',
                profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/5466.png',
                currentValue: 0,
                targetValue: targetVal,
                percentage: 0,
                isCurrentUser: true,
              });
            }

            const isCreatedByMe = ch.creator_id === currentUserId;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const myParticipation = (ch.participants || []).find((p: any) => p.profile_id === currentUserId);
            const isPending = myParticipation?.status === 'invited';

            const challengeStatus: 'active' | 'pending_acceptance' | 'completed' = isCompleted
              ? 'completed'
              : isPending
                ? 'pending_acceptance'
                : 'active';

            const metricText =
              ch.metric === 'rank'
                ? `Alcanzar ${ch.target_tier || 'Esmeralda'} ${ch.target_division || 'IV'}`
                : ch.metric === 'wins'
                  ? `Primero en sumar ${targetVal} victorias`
                  : `+${targetVal} Puntos de Liga (LP)`;

            const rules = ch.rules as Record<string, unknown> | null;
            const rewardText = (rules?.reward as string) || 'Título de Campeón del Círculo + Honor';

            return {
              id: String(ch.id),
              title: ch.name,
              type: (ch.metric as 'lp' | 'rank' | 'wins') || 'lp',
              status: challengeStatus,
              createdByMe: isCreatedByMe,
              createdAt: ch.created_at,
              endDate: ch.ends_at,
              daysRemaining: diffDays,
              targetMetric: metricText,
              targetValue: targetVal,
              reward: rewardText,
              participants: parts,
            };
          });

          setChallenges(mapped);

          if (targetId) {
            const match = mapped.find((c) => c.id === targetId);
            if (match) {
              setActiveTab(
                match.status === 'completed'
                  ? 'history'
                  : match.status === 'pending_acceptance'
                    ? 'pending'
                    : 'active',
              );
            }
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [targetId]);

  useEffect(() => {
    if (targetId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`challenge-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [targetId]);

  async function handleAccept(challengeId: string) {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase
        .from('challenge_participants')
        .update({ status: 'accepted', joined_at: new Date().toISOString() })
        .eq('challenge_id', Number(challengeId))
        .eq('profile_id', userData.user.id);
    }

    setChallenges((prev) =>
      prev.map((ch) => (ch.id === challengeId ? { ...ch, status: 'active' } : ch)),
    );
    setActionNotice('¡Reto aceptado! Ahora está activo en tu lista.');
    setTimeout(() => setActionNotice(''), 4000);
  }

  async function handleReject(challengeId: string) {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase
        .from('challenge_participants')
        .update({ status: 'declined' })
        .eq('challenge_id', Number(challengeId))
        .eq('profile_id', userData.user.id);
    }

    setChallenges((prev) => prev.filter((ch) => ch.id !== challengeId));
    setActionNotice('Invitación rechazada.');
    setTimeout(() => setActionNotice(''), 4000);
  }

  const activeChallenges = challenges.filter((ch) => ch.status === 'active');
  const pendingChallenges = challenges.filter((ch) => ch.status === 'pending_acceptance');
  const historyChallenges = challenges.filter((ch) => ch.status === 'completed');

  const displayedList =
    activeTab === 'active'
      ? activeChallenges
      : activeTab === 'pending'
        ? pendingChallenges
        : historyChallenges;

  return (
    <div className="app-shell" id="retos">
      <AppSidebar active="Retos" />
      <main className="dashboard-main challenge-create-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Duelos y Carreras / Temporada 2026</p>
            <h1>Retos Competitivos</h1>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        <div className="challenge-intro">
          <div>
            <span className="section-index"><Sword size={24} weight="bold" /></span>
            <h2>Compite contra tu círculo.<br />Mide quién sube más rápido.</h2>
          </div>
          <p>Lanza carreras de LP, duelos de fin de semana o carreras de división en clasificatorias.</p>
        </div>

        {/* Métricas Resumen */}
        <section className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '32px' }}>
          <article className="metric metric-featured">
            <span className="metric-label">Retos Activos</span>
            <strong>{activeChallenges.length}</strong>
            <small>En curso</small>
          </article>
          <article className="metric">
            <span className="metric-label">Invitaciones</span>
            <strong>{pendingChallenges.length}</strong>
            <small>{pendingChallenges.length === 1 ? '1 pendiente' : `${pendingChallenges.length} pendientes`}</small>
          </article>
          <article className="metric">
            <span className="metric-label">Victorias</span>
            <strong>{historyChallenges.filter((ch) => ch.winnerIsCurrentUser).length}</strong>
            <small>Retos ganados</small>
          </article>
          <article className="metric">
            <span className="metric-label">Tasa de Éxito</span>
            <strong>
              {historyChallenges.length > 0
                ? `${Math.round((historyChallenges.filter((ch) => ch.winnerIsCurrentUser).length / historyChallenges.length) * 100)}%`
                : '0%'}
            </strong>
            <small>{historyChallenges.length} disputados</small>
          </article>
        </section>

        {/* Barra de Acciones y Pestañas */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div className="period-tabs" role="tablist">
            <button
              type="button"
              className={activeTab === 'active' ? 'is-active' : ''}
              onClick={() => setActiveTab('active')}
              role="tab"
              aria-selected={activeTab === 'active'}
            >
              Activos ({activeChallenges.length})
            </button>
            <button
              type="button"
              className={activeTab === 'pending' ? 'is-active' : ''}
              onClick={() => setActiveTab('pending')}
              role="tab"
              aria-selected={activeTab === 'pending'}
            >
              Invitaciones ({pendingChallenges.length})
            </button>
            <button
              type="button"
              className={activeTab === 'history' ? 'is-active' : ''}
              onClick={() => setActiveTab('history')}
              role="tab"
              aria-selected={activeTab === 'history'}
            >
              Historial ({historyChallenges.length})
            </button>
          </div>

          <Link
            href="/retos/nuevo"
            className="create-button"
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <Plus size={18} weight="bold" />
            <span>Crear Reto</span>
          </Link>
        </div>

        {actionNotice ? (
          <div className="auth-feedback" style={{ marginBottom: '20px' }}>
            <Check size={18} weight="bold" />
            <span>{actionNotice}</span>
          </div>
        ) : null}

        {/* Listado de Retos */}
        {!loading && displayedList.length === 0 ? (
          <section
            className="panel"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: 'var(--surface-alt)',
              border: '3px solid var(--line)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                background: 'var(--surface)',
                border: '2px solid var(--line)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--muted)',
              }}
            >
              <FlagCheckered size={36} weight="bold" />
            </div>
            <h3 style={{ margin: '0 0 8px', font: '900 20px/1 var(--font-display)', textTransform: 'uppercase' }}>
              No hay retos en esta sección
            </h3>
            <p style={{ color: 'var(--muted)', font: '800 13px var(--font-mono)', margin: '0 0 24px' }}>
              {activeTab === 'active'
                ? 'No tienes ningún reto en curso actualmente. ¡Lanza un duelo a tus amigos!'
                : activeTab === 'pending'
                  ? 'No tienes invitaciones de retos pendientes por responder.'
                  : 'Aún no has completado retos anteriores.'}
            </p>
            <Link href="/retos/nuevo" className="create-button" style={{ display: 'inline-flex', margin: '0 auto', padding: '0 20px', textDecoration: 'none' }}>
              <Plus size={18} weight="bold" />
              <span>Crear Reto</span>
            </Link>
          </section>
        ) : (
          <div style={{ display: 'grid', gap: '24px' }}>
            {displayedList.map((ch) => {
              const p1 = ch.participants[0];
              const p2 = ch.participants[1];
              const isLeading = p1 && p2 && p1.currentValue >= p2.currentValue;

              return (
                <article
                  key={ch.id}
                  id={`challenge-${ch.id}`}
                  className="panel"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Cabecera del Reto */}
                  <div
                    style={{
                      padding: '14px 20px',
                      background: ch.status === 'active' ? 'var(--accent)' : 'var(--surface-alt)',
                      color: ch.status === 'active' ? 'var(--on-accent)' : 'var(--ink)',
                      borderBottom: '3px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {ch.type === 'lp' ? (
                        <Trophy size={20} weight="fill" />
                      ) : ch.type === 'rank' ? (
                        <ShieldChevron size={20} weight="fill" />
                      ) : (
                        <FlagCheckered size={20} weight="fill" />
                      )}
                      <strong style={{ font: '900 16px/1 var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {ch.title}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {ch.status === 'active' ? (
                        <span
                          style={{
                            font: '800 11px var(--font-mono)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '3px 8px',
                            border: '1.5px solid currentColor',
                          }}
                        >
                          <Clock size={14} weight="bold" />
                          <span>{ch.daysRemaining} DÍAS RESTANTES</span>
                        </span>
                      ) : ch.status === 'completed' ? (
                        <span
                          style={{
                            font: '800 11px var(--font-mono)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'var(--accent)',
                            color: 'var(--on-accent)',
                            padding: '3px 8px',
                            border: '1.5px solid var(--line)',
                          }}
                        >
                          <Check size={14} weight="bold" />
                          <span>COMPLETADO</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            font: '800 11px var(--font-mono)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'var(--surface)',
                            color: 'var(--ink)',
                            padding: '3px 8px',
                            border: '1.5px solid var(--line)',
                          }}
                        >
                          <span>INVITACIÓN PENDIENTE</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo del Reto */}
                  <div style={{ padding: '24px', display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <span style={{ display: 'block', font: '800 10px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                          Objetivo de victoria
                        </span>
                        <strong style={{ font: '900 16px/1.2 var(--font-display)', textTransform: 'uppercase' }}>
                          {ch.targetMetric}
                        </strong>
                      </div>

                      {ch.reward ? (
                        <div style={{ background: 'var(--surface-alt)', padding: '8px 14px', border: '2px solid var(--line)' }}>
                          <span style={{ display: 'block', font: '800 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Recompensa / Apuesta
                          </span>
                          <strong style={{ font: '800 12px var(--font-mono)' }}>
                            {ch.reward}
                          </strong>
                        </div>
                      ) : null}
                    </div>

                    {/* Participantes Cara a Cara */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {ch.participants.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: '16px',
                            border: '2px solid var(--line)',
                            background: 'var(--bg)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {p.profileIconUrl ? (
                                <div style={{ width: '38px', height: '38px', border: '2px solid var(--line)', overflow: 'hidden' }}>
                                  <img src={p.profileIconUrl} alt={p.displayName} width={38} height={38} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ) : (
                                <span className="avatar avatar-small">{p.displayName.slice(0, 2).toUpperCase()}</span>
                              )}
                              <div>
                                <strong style={{ font: '900 14px/1 var(--font-display)', textTransform: 'uppercase' }}>
                                  {p.displayName}
                                </strong>
                                <small style={{ font: '700 10px var(--font-mono)', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                                  {p.tagLine} {p.isCurrentUser ? '(Tú)' : ''}
                                </small>
                              </div>
                            </div>

                            <strong style={{ font: '900 18px var(--font-mono)', color: p.isCurrentUser ? 'var(--accent-bright)' : 'inherit' }}>
                              {p.currentValue} / {p.targetValue}
                            </strong>
                          </div>

                          {/* Barra de progreso */}
                          <div>
                            <div className="progress-track" style={{ height: '8px' }}>
                              <span style={{ width: `${Math.min(100, Math.max(4, p.percentage))}%`, background: p.isCurrentUser ? 'var(--accent)' : 'var(--ink)' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', font: '700 10px var(--font-mono)', color: 'var(--muted)' }}>
                              <span>Progreso actual</span>
                              <span>{p.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Estado de ventaja o acciones */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '2px solid var(--line)', paddingTop: '16px' }}>
                      {ch.status === 'active' && p1 && p2 ? (
                        <span
                          style={{
                            font: '800 11px var(--font-mono)',
                            color: isLeading ? 'var(--ink)' : 'var(--accent-bright)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--surface-alt)',
                            padding: '6px 12px',
                            border: '1.5px solid var(--line)',
                          }}
                        >
                          <Flame size={16} weight="fill" />
                          <span>
                            {isLeading
                              ? `¡Vas liderando el duelo por +${p1.currentValue - p2.currentValue} pts!`
                              : `${p2.displayName} va liderando (+${p2.currentValue - p1.currentValue} pts)`}
                          </span>
                        </span>
                      ) : ch.status === 'completed' ? (
                        <span
                          style={{
                            font: '800 11px var(--font-mono)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--surface-alt)',
                            padding: '6px 12px',
                            border: '1.5px solid var(--line)',
                          }}
                        >
                          <Trophy size={16} weight="fill" />
                          <span>Ganador: <strong>{ch.winnerName || 'Reto Finalizado'}</strong></span>
                        </span>
                      ) : (
                        <span style={{ font: '800 11px var(--font-mono)', color: 'var(--muted)' }}>
                          ¿Aceptas el reto de tu rival?
                        </span>
                      )}

                      <div style={{ display: 'flex', gap: '10px' }}>
                        {ch.status === 'pending_acceptance' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReject(ch.id)}
                              className="secondary-button"
                              style={{ padding: '0 14px', fontSize: '11px' }}
                            >
                              <X size={15} weight="bold" />
                              <span>Rechazar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAccept(ch.id)}
                              className="create-button"
                              style={{ margin: 0, padding: '0 16px', fontSize: '11px' }}
                            >
                              <Check size={16} weight="bold" />
                              <span>Aceptar Reto</span>
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/comparar?summoner=${encodeURIComponent(p2?.displayName || '')}&tag=${encodeURIComponent(p2?.tagLine?.replace('#', '') || '')}`}
                            className="secondary-button"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '0 14px', fontSize: '11px' }}
                          >
                            <ArrowsLeftRight size={16} weight="bold" />
                            <span>Ver Análisis Cara a Cara</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
