/* eslint-disable @next/next/no-img-element */
'use client';

import {
  ArrowRight,
  Bell,
  Check,
  Crosshair,
  Flame,
  GameController,
  Medal,
  ShieldChevron,
  Sword,
  Trophy,
  UsersThree,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { formatTierName, getRankInitials } from '@/lib/riot/format';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Period = 'Día' | 'Semana' | 'Mes';
const periods: Period[] = ['Día', 'Semana', 'Mes'];

type RankedSnapshotRow = Database['public']['Tables']['ranked_snapshots']['Row'];
type RiotAccountRow = Database['public']['Tables']['riot_accounts']['Row'];

interface RiotSummary {
  summonerLevel: number;
  profileIconUrl: string;
  splashArtUrl: string;
  topChampion: {
    id: number;
    name: string;
    points: number;
    level: number;
  };
}

const defaultFriends = [
  { name: 'Kuro', tag: '#EUW', lp: '78 LP', tone: 'blue' },
  { name: 'Maya', tag: '#LAS', lp: '54 LP', tone: 'green' },
  { name: 'Nox', tag: '#LAN', lp: '32 LP', tone: 'orange' },
];

const periodChartData: Record<Period, { points: number; path: string; dates: string[] }> = {
  Día: {
    points: 12,
    path: 'M0 176 C54 158 74 174 126 137 S211 121 263 88 S358 101 420 46 S511 58 570 24',
    dates: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
  },
  Semana: {
    points: 78,
    path: 'M0 181 C46 170 80 188 127 148 S210 126 264 93 S355 110 419 52 S510 63 570 25',
    dates: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  },
  Mes: {
    points: 140,
    path: 'M0 190 C52 179 74 160 127 171 S215 118 267 126 S355 69 421 80 S511 39 570 20',
    dates: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
  },
};

export function Dashboard() {
  const [period, setPeriod] = useState<Period>('Semana');
  const [profileName, setProfileName] = useState('Invocador');
  const [riotAccount, setRiotAccount] = useState<RiotAccountRow | null>(null);
  const [snapshot, setSnapshot] = useState<RankedSnapshotRow | null>(null);
  const [riotSummary, setRiotSummary] = useState<RiotSummary | null>(null);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar notificaciones al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        if (isMounted) setLoading(false);
        return;
      }

      const userId = userData.user.id;

      // 1. Cargar perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile && isMounted) {
        setProfileName(profile.display_name);
      }

      // 2. Cargar cuenta de Riot
      const { data: account } = await supabase
        .from('riot_accounts')
        .select('*')
        .eq('profile_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      if (isMounted) {
        setRiotAccount(account);
      }

      // 3. Cargar snapshot ranked
      if (account) {
        const { data: snap } = await supabase
          .from('ranked_snapshots')
          .select('*')
          .eq('riot_account_id', account.id)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (isMounted) {
          setSnapshot(snap);
        }

        // 4. Cargar resumen enriquecido (banner, top champ, icono)
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const summaryRes = await fetch('/api/riot/summary', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (summaryRes.ok && isMounted) {
              const summaryData = (await summaryRes.json()) as RiotSummary;
              setRiotSummary(summaryData);
            }
          }
        } catch {
          // Ignorar fallo de summary para no bloquear dashboard
        }
      }

      // 5. Cargar solicitudes de amistad pendientes
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('addressee_id', userId)
        .eq('status', 'pending');

      if (isMounted) {
        setPendingFriendRequests(count || 0);
        setLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = riotAccount?.game_name || profileName;
  const tagLine = riotAccount ? `#${riotAccount.tag_line}` : '#LAN';
  const initials = displayName.slice(0, 2).toUpperCase();

  const tier = snapshot?.tier || 'BRONZE';
  const division = snapshot?.division || 'I';
  const lp = snapshot?.league_points ?? 0;
  const wins = snapshot?.wins ?? 0;
  const losses = snapshot?.losses ?? 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div className="app-shell" id="inicio">
      <AppSidebar active="Resumen" />
      <main className="dashboard-main">
        <header className="topbar">
          <div><p className="eyebrow">Panel personal / Temporada 2026</p><h1>Tu rendimiento</h1></div>
          <div className="topbar-actions">
            {/* Popover de Notificaciones */}
            <div style={{ position: 'relative' }} ref={notifDropdownRef}>
              <button
                className="icon-button notification-button"
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Ver notificaciones"
                aria-expanded={showNotifications}
              >
                <Bell size={20} weight="bold" />
                {pendingFriendRequests > 0 ? <span className="notification-dot" /> : null}
              </button>

              {showNotifications ? (
                <div
                  className="panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '320px',
                    padding: '16px',
                    zIndex: 100,
                    boxShadow: '6px 6px 0 var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <strong style={{ font: '900 13px/1 var(--font-display)', textTransform: 'uppercase' }}>
                      Notificaciones
                    </strong>
                    <span className="profile-badge" style={{ fontSize: '9px', padding: '2px 6px' }}>
                      {pendingFriendRequests > 0 ? `${pendingFriendRequests} Nuevas` : 'Al día'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    {pendingFriendRequests > 0 ? (
                      <Link
                        href="/amigos"
                        onClick={() => setShowNotifications(false)}
                        style={{
                          padding: '10px 12px',
                          background: 'color-mix(in oklch, var(--accent) 12%, var(--surface))',
                          border: '2px solid var(--line)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          textDecoration: 'none',
                          color: 'var(--ink)',
                        }}
                      >
                        <UsersThree size={20} weight="bold" color="var(--accent-bright)" />
                        <div>
                          <strong style={{ font: '800 12px/1.2 var(--font-sans)', display: 'block' }}>
                            {pendingFriendRequests} {pendingFriendRequests === 1 ? 'Solicitud de amistad' : 'Solicitudes de amistad'}
                          </strong>
                          <small style={{ font: '700 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase' }}>
                            Haz clic para revisar
                          </small>
                        </div>
                      </Link>
                    ) : null}

                    <Link
                      href="/retos"
                      onClick={() => setShowNotifications(false)}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--surface-alt)',
                        border: '2px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textDecoration: 'none',
                        color: 'var(--ink)',
                      }}
                    >
                      <Sword size={20} weight="bold" color="var(--accent-bright)" />
                      <div>
                        <strong style={{ font: '800 12px/1.2 var(--font-sans)', display: 'block' }}>
                          Retos de Temporada
                        </strong>
                        <small style={{ font: '700 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Revisa tus duelos activos
                        </small>
                      </div>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <ThemeToggle />

            {/* Mini Perfil Clickable hacia Ajustes / Vincular Riot */}
            <Link
              href="/vincular-riot"
              className="mini-profile"
              aria-label={`Perfil de ${displayName} - Configurar cuenta`}
              style={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              {riotSummary?.profileIconUrl ? (
                <img
                  src={riotSummary.profileIconUrl}
                  alt={displayName}
                  width={38}
                  height={38}
                  style={{ border: '2px solid var(--line)', background: 'var(--surface)' }}
                />
              ) : (
                <span className="avatar avatar-small">{initials}</span>
              )}
              <span><strong>{displayName}</strong><small>{tagLine}</small></span>
            </Link>
          </div>
        </header>

        {!loading && !riotAccount ? (
          <section className="panel" style={{ padding: '24px', margin: '24px 0', border: '3px solid var(--line)', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', display: 'grid', placeItems: 'center', background: 'var(--accent)', color: 'var(--on-accent)', border: '2px solid var(--line)' }}>
                <GameController size={28} weight="bold" />
              </div>
              <div>
                <strong style={{ display: 'block', font: '800 18px/1.2 var(--font-display)', textTransform: 'uppercase' }}>Vincula tu cuenta de Riot Games</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>Conecta tu Riot ID para sincronizar tus LP, victorias y rango en vivo.</p>
              </div>
            </div>
            <Link className="secondary-button" href="/vincular-riot" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <span>Vincular Riot ID</span>
              <ArrowRight size={18} weight="bold" />
            </Link>
          </section>
        ) : null}

        {riotSummary ? (
          <section
            className="profile-banner"
            style={{ backgroundImage: `url(${riotSummary.splashArtUrl})` }}
            aria-label={`Banner de ${displayName}`}
          >
            <div className="profile-banner-overlay" />
            <div className="profile-banner-content">
              <div className="profile-banner-left">
                <div className="profile-banner-avatar">
                  <img
                    src={riotSummary.profileIconUrl}
                    alt={`Ícono de ${displayName}`}
                    width={96}
                    height={96}
                  />
                  <span className="profile-banner-level">
                    NVL {riotSummary.summonerLevel}
                  </span>
                </div>

                <div className="profile-banner-info">
                  <h2 className="profile-banner-name">
                    {displayName} <span className="profile-banner-tag">{tagLine}</span>
                  </h2>
                  <div className="profile-banner-meta">
                    <span className="profile-badge profile-badge-accent">
                      {formatTierName(tier, division)}
                    </span>
                    <span className="profile-badge">
                      {lp} LP
                    </span>
                    <span className="profile-badge">
                      {winRate}% WR ({wins}V - {losses}D)
                    </span>
                  </div>
                </div>
              </div>

              {riotSummary.topChampion ? (
                <div className="mastery-card" aria-label="Campeón principal">
                  <div className="mastery-card-header">
                    <Flame size={14} weight="fill" />
                    <span>Campeón Principal</span>
                  </div>
                  <strong className="mastery-card-name">
                    {riotSummary.topChampion.name}
                  </strong>
                  <div className="mastery-card-points">
                    <span>Maestría {riotSummary.topChampion.level}</span>
                    <span>{riotSummary.topChampion.points.toLocaleString()} PTS</span>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="profile-hero">
            <div className="rank-emblem" aria-label={`Rango: ${tier} ${division}`}>
              <ShieldChevron size={58} weight="fill" />
              <span>{getRankInitials(division)}</span>
            </div>
            <div className="profile-copy">
              <p className="eyebrow">Invocador principal</p>
              <h2>{displayName}</h2>
              <div className="rank-line">
                <span>{tagLine}</span>
                <span>{formatTierName(tier, division)}</span>
                <span><strong>{lp} LP</strong></span>
              </div>
            </div>
            <div className="season-goal">
              <span className="eyebrow">Meta de la temporada</span>
              <strong>Esmeralda IV</strong>
              <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(5, lp))}%` }} /></div>
              <small><Medal size={14} weight="bold" /> {lp > 0 ? `${lp} LP acumulados` : '0 LP'}</small>
            </div>
          </section>
        )}

        <section className="metrics" aria-label="Métricas principales de la temporada">
          <article className="metric"><span className="eyebrow">Puntos de liga</span><strong>{lp}</strong><small>{tier} {division}</small></article>
          <article className="metric"><span className="eyebrow">Win rate</span><strong>{winRate}%</strong><small>{totalGames} partidas</small></article>
          <article className="metric"><span className="eyebrow">Victorias</span><strong>{wins}</strong><small>Partidas ganadas</small></article>
          <article className="metric"><span className="eyebrow">Derrotas</span><strong>{losses}</strong><small>Partidas perdidas</small></article>
        </section>

        <section className="panel performance-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Evolución</p><h2>Rendimiento</h2></div>
            <div className="neo-tabs">
              {periods.map((item) => <button key={item} type="button" className={period === item ? 'is-active' : ''} onClick={() => setPeriod(item)} aria-pressed={period === item}>{item}</button>)}
            </div>
          </div>
          <div className="chart-legend"><span><i className="legend-player" /> {displayName} <strong>{lp} LP</strong></span><span><i className="legend-rival" /> Kuro <strong>{periodChartData[period].points} LP</strong></span></div>
          <figure className="chart" aria-label={`Evolución de LP durante el periodo: ${period}`}>
            <div className="chart-y-axis" aria-hidden="true"><span>+160</span><span>+120</span><span>+80</span><span>+40</span><span>0</span></div>
            <svg viewBox="0 0 570 210" role="img" aria-labelledby="chart-title chart-description" preserveAspectRatio="none">
              <title id="chart-title">Evolución de puntos de liga</title>
              <desc id="chart-description">Gráfico de líneas que muestra la ganancia de LP para {displayName} y su rival.</desc>
              {[20, 62, 104, 146, 188].map((y) => <line key={y} x1="0" y1={y} x2="570" y2={y} className="grid-line" />)}
              <path d="M0 188 C50 178 78 152 130 162 S220 120 274 132 S360 84 418 98 S504 74 570 82" className="chart-line rival-line" />
              <path d={periodChartData[period].path} className="chart-line player-line" />
              <circle cx="570" cy={period === 'Día' ? 24 : 25} r="6" className="chart-point" />
            </svg>
            <div className="chart-x-axis" aria-hidden="true">{periodChartData[period].dates.map((d) => <span key={d}>{d}</span>)}</div>
          </figure>
        </section>

        <div className="dashboard-grid">
          <section className="panel" aria-labelledby="circle-title">
            <div className="panel-heading compact"><div><p className="eyebrow">Clasificación</p><h2 id="circle-title">Tu Círculo</h2></div><Trophy size={32} weight="fill" /></div>
            <ol className="friends-rank">
              <li className="is-player">
                <span className="place">01</span>
                {riotSummary?.profileIconUrl ? (
                  <img
                    src={riotSummary.profileIconUrl}
                    alt={displayName}
                    width={38}
                    height={38}
                    style={{ border: '2px solid var(--line)', background: 'var(--surface)' }}
                  />
                ) : (
                  <span className="avatar avatar-red">{initials}</span>
                )}
                <span className="friend-name"><strong>{displayName}</strong><small>{tagLine}</small></span>
                <strong className="friend-lp">{lp} LP</strong>
              </li>
              {defaultFriends.slice(1).map((friend, idx) => (
                <li key={friend.name}>
                  <span className="place">{`0${idx + 2}`}</span>
                  <span className={`avatar avatar-${friend.tone}`}>{friend.name.slice(0, 2).toUpperCase()}</span>
                  <span className="friend-name"><strong>{friend.name}</strong><small>{friend.tag}</small></span>
                  <strong className="friend-lp">{friend.lp}</strong>
                </li>
              ))}
            </ol>
            <Link href="/clasificacion" className="text-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Ver clasificación completa →
            </Link>
          </section>

          <section className="panel challenge-panel" aria-labelledby="challenge-title">
            <div className="challenge-symbol"><Crosshair size={42} weight="bold" /></div>
            <div className="challenge-info"><p className="eyebrow">Reto activo / 12 días restantes</p><h2 id="challenge-title">Road to Emerald</h2><p>El primero en alcanzar Esmeralda IV gana. Cuatro amigos, una sola meta.</p></div>
            <div className="challenge-progress"><div><span>Tu progreso</span><strong>{lp > 0 ? `${lp} LP` : '0%'}</strong></div><div className="progress-track large"><span style={{ width: `${Math.min(100, Math.max(5, lp))}%` }} /></div><small><Check size={15} weight="bold" /> {lp} LP acumulados</small></div>
            <Link href="/retos" className="secondary-button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              Ver reto
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
