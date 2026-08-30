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

const mockChallenges: ChallengeItem[] = [
  {
    id: 'ch-1',
    title: 'Carrera a Esmeralda IV',
    type: 'rank',
    status: 'active',
    createdByMe: true,
    createdAt: '2026-08-20',
    endDate: '2026-09-20',
    daysRemaining: 18,
    targetMetric: 'Alcanzar Rango Esmeralda IV',
    targetValue: 100,
    reward: 'Título de Campeón del Círculo + Honor',
    participants: [
      {
        id: 'user-1',
        displayName: 'jacksONFIRE',
        tagLine: '#ASM',
        profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/5466.png',
        currentValue: 61,
        targetValue: 100,
        percentage: 61,
        isCurrentUser: true,
      },
      {
        id: 'user-2',
        displayName: 'Kuro',
        tagLine: '#EUW',
        profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/3554.png',
        currentValue: 78,
        targetValue: 100,
        percentage: 78,
        isCurrentUser: false,
      },
    ],
  },
  {
    id: 'ch-2',
    title: 'Duelo de 100 LP en Fin de Semana',
    type: 'lp',
    status: 'active',
    createdByMe: false,
    createdAt: '2026-08-28',
    endDate: '2026-09-04',
    daysRemaining: 5,
    targetMetric: '+100 Puntos de Liga (LP)',
    targetValue: 100,
    reward: 'Skin misteriosa de regalo',
    participants: [
      {
        id: 'user-1',
        displayName: 'jacksONFIRE',
        tagLine: '#ASM',
        profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/5466.png',
        currentValue: 45,
        targetValue: 100,
        percentage: 45,
        isCurrentUser: true,
      },
      {
        id: 'user-3',
        displayName: 'Aegis',
        tagLine: '#LAS',
        profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/4405.png',
        currentValue: 30,
        targetValue: 100,
        percentage: 30,
        isCurrentUser: false,
      },
    ],
  },
  {
    id: 'ch-3',
    title: 'Desafío de 20 Victorias en Ranked',
    type: 'wins',
    status: 'pending_acceptance',
    createdByMe: false,
    createdAt: '2026-08-29',
    endDate: '2026-09-15',
    daysRemaining: 16,
    targetMetric: 'Primero en sumar 20 victorias',
    targetValue: 20,
    reward: 'Cena de celebración',
    participants: [
      {
        id: 'user-4',
        displayName: 'Solari',
        tagLine: '#LAN',
        profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/1630.png',
        currentValue: 0,
        targetValue: 20,
        percentage: 0,
        isCurrentUser: false,
      },
      {
        id: 'user-1',
        displayName: 'jacksONFIRE',
        tagLine: '#ASM',
        profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/5466.png',
        currentValue: 0,
        targetValue: 20,
        percentage: 0,
        isCurrentUser: true,
      },
    ],
  },
  {
    id: 'ch-4',
    title: 'Sprint de Apertura Split 2',
    type: 'lp',
    status: 'completed',
    createdByMe: true,
    createdAt: '2026-08-01',
    endDate: '2026-08-15',
    daysRemaining: 0,
    targetMetric: '+80 LP en 14 días',
    targetValue: 80,
    reward: 'Gloria en el Círculo',
    winnerName: 'jacksONFIRE',
    winnerIsCurrentUser: true,
    participants: [
      {
        id: 'user-1',
        displayName: 'jacksONFIRE',
        tagLine: '#ASM',
        profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/5466.png',
        currentValue: 85,
        targetValue: 80,
        percentage: 100,
        isCurrentUser: true,
      },
      {
        id: 'user-2',
        displayName: 'Kuro',
        tagLine: '#EUW',
        profileIconUrl: 'https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/3554.png',
        currentValue: 62,
        targetValue: 80,
        percentage: 77,
        isCurrentUser: false,
      },
    ],
  },
];

export function ChallengesListView() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get('challengeId');

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (!targetId) return 'active';
    const match = mockChallenges.find((c) => c.id === targetId);
    if (match?.status === 'completed') return 'history';
    if (match?.status === 'pending_acceptance') return 'pending';
    return 'active';
  });

  const [challenges, setChallenges] = useState<ChallengeItem[]>(mockChallenges);
  const [actionNotice, setActionNotice] = useState('');

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

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      if (userData?.user) {
        // En una etapa avanzada, aquí se cargan los retos de public.challenges y challenge_participants
      }
    }
    void loadData();
  }, []);

  function handleAccept(challengeId: string) {
    setChallenges((prev) =>
      prev.map((ch) => (ch.id === challengeId ? { ...ch, status: 'active' } : ch)),
    );
    setActionNotice('¡Reto aceptado! Ahora está activo en tu lista.');
    setTimeout(() => setActionNotice(''), 4000);
  }

  function handleReject(challengeId: string) {
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

        {/* Intro con Acción Destacada */}
        <div className="challenge-intro" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span className="section-index"><Sword size={24} weight="bold" /></span>
            <h2>Compite directamente<br />con tus rivales.</h2>
            <p style={{ margin: '8px 0 0', maxWidth: '520px' }}>
              Pon metas claras de LP o rangos, sigue la carrera en tiempo real y demuestra quién manda en la grieta.
            </p>
          </div>

          <Link href="/retos/nuevo" className="create-button" style={{ margin: 0, padding: '0 24px', minHeight: '52px', textDecoration: 'none' }}>
            <Plus size={22} weight="bold" />
            <span>Crear Nuevo Reto</span>
          </Link>
        </div>

        {/* Métricas Resumen de Retos */}
        <section className="metrics" style={{ marginBottom: '32px' }}>
          <article className="metric">
            <span className="eyebrow">En Curso</span>
            <strong>{activeChallenges.length}</strong>
            <small>Retos activos</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Invitaciones</span>
            <strong style={{ color: pendingChallenges.length > 0 ? 'var(--accent-bright)' : 'var(--ink)' }}>
              {pendingChallenges.length}
            </strong>
            <small>Pendientes por aceptar</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Victorias</span>
            <strong>3</strong>
            <small>Retos conquistados</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Tasa de Éxito</span>
            <strong>75%</strong>
            <small>Efectividad en duelos</small>
          </article>
        </section>

        {/* Aviso de acción */}
        {actionNotice ? (
          <div className="auth-feedback" style={{ marginBottom: '20px' }} role="status">
            <Check size={18} weight="bold" />
            <span>{actionNotice}</span>
          </div>
        ) : null}

        {/* Pestañas de Navegación de Retos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div className="neo-tabs">
            <button
              type="button"
              className={activeTab === 'active' ? 'is-active' : ''}
              onClick={() => setActiveTab('active')}
            >
              <Flame size={16} weight="bold" style={{ marginRight: '6px' }} />
              Activos ({activeChallenges.length})
            </button>
            <button
              type="button"
              className={activeTab === 'pending' ? 'is-active' : ''}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={16} weight="bold" style={{ marginRight: '6px' }} />
              Invitaciones ({pendingChallenges.length})
            </button>
            <button
              type="button"
              className={activeTab === 'history' ? 'is-active' : ''}
              onClick={() => setActiveTab('history')}
            >
              <FlagCheckered size={16} weight="bold" style={{ marginRight: '6px' }} />
              Historial ({historyChallenges.length})
            </button>
          </div>
        </div>

        {/* Lista de Tarjetas de Retos */}
        {displayedList.length === 0 ? (
          <section className="panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div className="rank-emblem" style={{ width: '64px', height: '64px', margin: '0 auto 16px' }}>
              <Sword size={36} weight="fill" />
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
                    outline: ch.id === targetId ? '4px solid var(--accent-bright)' : undefined,
                    outlineOffset: ch.id === targetId ? '4px' : undefined,
                    boxShadow: ch.id === targetId ? '8px 8px 0 var(--line)' : undefined,
                    transition: 'all 240ms ease',
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
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {ch.type === 'lp' ? (
                        <Trophy size={20} weight="bold" />
                      ) : ch.type === 'rank' ? (
                        <ShieldChevron size={20} weight="bold" />
                      ) : (
                        <FlagCheckered size={20} weight="bold" />
                      )}
                      <strong style={{ font: '900 14px/1 var(--font-display)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                        {ch.title}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {ch.status === 'active' ? (
                        <span
                          style={{
                            font: '800 11px/1 var(--font-mono)',
                            background: 'rgba(0, 0, 0, 0.4)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Clock size={14} weight="bold" />
                          <span>{ch.daysRemaining} DÍAS RESTANTES</span>
                        </span>
                      ) : ch.status === 'pending_acceptance' ? (
                        <span className="profile-badge profile-badge-accent" style={{ fontSize: '10px' }}>
                          INVITACIÓN PENDIENTE
                        </span>
                      ) : (
                        <span className="profile-badge" style={{ fontSize: '10px', background: 'var(--ink)', color: 'var(--surface)' }}>
                          FINALIZADO · GANADOR: {ch.winnerName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo del Reto */}
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Objetivo y Recompensa */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <span className="eyebrow" style={{ margin: 0 }}>Objetivo de victoria</span>
                        <strong style={{ font: '900 16px/1.2 var(--font-display)', display: 'block', textTransform: 'uppercase', marginTop: '4px' }}>
                          {ch.targetMetric}
                        </strong>
                      </div>

                      {ch.reward ? (
                        <div style={{ padding: '6px 12px', background: 'var(--surface-alt)', border: '2px solid var(--line)' }}>
                          <small style={{ font: '700 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', display: 'block' }}>
                            Recompensa / Apuesta
                          </small>
                          <span style={{ font: '800 12px var(--font-mono)' }}>{ch.reward}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Duelo de Participantes */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                      {ch.participants.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: '16px',
                            background: p.isCurrentUser ? 'color-mix(in oklch, var(--accent) 8%, var(--surface))' : 'var(--surface-alt)',
                            border: '2px solid var(--line)',
                            boxShadow: '3px 3px 0 var(--line)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  border: '2px solid var(--line)',
                                  overflow: 'hidden',
                                  background: 'var(--surface)',
                                }}
                              >
                                {p.profileIconUrl ? (
                                  <img src={p.profileIconUrl} alt="" width={38} height={38} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div className="rank-emblem" style={{ width: '100%', height: '100%', border: 'none', boxShadow: 'none' }}>
                                    <ShieldChevron size={20} weight="fill" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <strong style={{ font: '900 14px/1 var(--font-display)', textTransform: 'uppercase', display: 'block' }}>
                                  {p.displayName}
                                </strong>
                                <small style={{ font: '700 10px var(--font-mono)', color: 'var(--muted)' }}>
                                  {p.tagLine} {p.isCurrentUser ? '(Tú)' : ''}
                                </small>
                              </div>
                            </div>

                            <strong style={{ font: '900 18px/1 var(--font-display)', color: p.isCurrentUser ? 'var(--accent-bright)' : 'var(--ink)' }}>
                              {p.currentValue} / {p.targetValue}
                            </strong>
                          </div>

                          {/* Barra de Progreso */}
                          <div style={{ width: '100%', height: '10px', background: 'var(--bg)', border: '2px solid var(--line)', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(p.percentage, 100)}%`,
                                height: '100%',
                                background: p.isCurrentUser ? 'var(--accent)' : 'var(--ink)',
                                transition: 'width 240ms ease',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', font: '800 10px var(--font-mono)' }}>
                            <span style={{ color: 'var(--muted)' }}>Progreso actual</span>
                            <span>{p.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Barra de Acciones y Ventaja */}
                    <div
                      style={{
                        paddingTop: '16px',
                        borderTop: '2px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ch.status === 'active' && p1 && p2 ? (
                          <span className="profile-badge profile-badge-accent" style={{ fontSize: '10px' }}>
                            <Flame size={14} weight="fill" />
                            <span>
                              {isLeading
                                ? `Vas liderando el reto (+${p1.currentValue - p2.currentValue} pts)`
                                : `${p2.displayName} va liderando (+${p2.currentValue - p1.currentValue} pts)`}
                            </span>
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        {ch.status === 'pending_acceptance' && !ch.createdByMe ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAccept(ch.id)}
                              className="create-button"
                              style={{ minHeight: '38px', margin: 0, padding: '0 16px', fontSize: '11px' }}
                            >
                              <Check size={16} weight="bold" />
                              <span>Aceptar Reto</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(ch.id)}
                              className="secondary-button"
                              style={{ minHeight: '38px', padding: '0 16px', fontSize: '11px', background: 'var(--surface)' }}
                            >
                              <X size={16} weight="bold" />
                              <span>Rechazar</span>
                            </button>
                          </>
                        ) : (
                          <Link
                            href="/comparar"
                            className="secondary-button"
                            style={{ minHeight: '38px', padding: '0 16px', fontSize: '11px', display: 'inline-flex', textDecoration: 'none' }}
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
