/* eslint-disable @next/next/no-img-element */
'use client';

import {
  ArrowRight,
  Bell,
  Check,
  Crosshair,
  Flame,
  GameController,
  ShieldChevron,
  Trophy,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { formatTierName, getRankInitials } from '@/lib/riot/format';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Period = 'Día' | 'Semana' | 'Mes';
const periods: Period[] = ['Día', 'Semana', 'Mes'];

type RiotAccountRow = Database['public']['Tables']['riot_accounts']['Row'];
type RankedSnapshotRow = Database['public']['Tables']['ranked_snapshots']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface RiotSummary {
  gameName: string;
  tagLine: string;
  platform: string;
  summonerLevel: number;
  profileIconUrl: string;
  splashArtUrl: string;
  topChampion: {
    name: string;
    points: number;
    level: number;
  };
}

const periodData: Record<Period, { lp: string; games: string; wins: string; rate: string; playerPath: string; rivalPath: string }> = {
  Día: {
    lp: '+22', games: '4', wins: '3', rate: '75%',
    playerPath: 'M0 176 C54 158 74 174 126 137 S211 121 263 88 S358 101 420 46 S511 58 570 24',
    rivalPath: 'M0 185 C59 177 83 144 141 151 S230 115 287 124 S374 78 428 91 S516 64 570 73',
  },
  Semana: {
    lp: '+138', games: '27', wins: '17', rate: '63%',
    playerPath: 'M0 181 C46 170 80 188 127 148 S210 126 264 93 S355 110 419 52 S510 63 570 25',
    rivalPath: 'M0 190 C49 181 89 146 142 158 S229 118 286 130 S372 83 429 97 S515 70 570 78',
  },
  Mes: {
    lp: '+306', games: '82', wins: '49', rate: '60%',
    playerPath: 'M0 190 C52 179 74 160 127 171 S215 118 267 126 S355 69 421 80 S511 39 570 20',
    rivalPath: 'M0 183 C56 151 85 175 143 140 S233 150 289 104 S376 120 431 86 S516 101 570 65',
  },
};

const defaultFriends = [
  { place: '01', name: 'Andre', tag: '#LAN', lp: '+138', tone: 'red' },
  { place: '02', name: 'Kuro', tag: '#EUW', lp: '+112', tone: 'dark' },
  { place: '03', name: 'Maya', tag: '#LAS', lp: '+84', tone: 'light' },
  { place: '04', name: 'Nox', tag: '#LAN', lp: '+61', tone: 'muted' },
];

function PerformanceChart({ period }: { period: Period }) {
  const data = periodData[period];
  const pointY = period === 'Día' ? 24 : period === 'Semana' ? 25 : 20;
  return (
    <figure className="chart" aria-label={`Evolución de LP durante el periodo: ${period}`}>
      <div className="chart-y-axis" aria-hidden="true"><span>+160</span><span>+120</span><span>+80</span><span>+40</span><span>0</span></div>
      <svg viewBox="0 0 570 210" role="img" aria-labelledby="chart-title chart-description" preserveAspectRatio="none">
        <title id="chart-title">Comparativa de puntos de liga</title>
        <desc id="chart-description">Evolución de puntos de liga durante el periodo.</desc>
        {[20, 62, 104, 146, 188].map((y) => <line key={y} x1="0" y1={y} x2="570" y2={y} className="grid-line" />)}
        <path d={data.rivalPath} className="chart-line rival-line" />
        <path d={data.playerPath} className="chart-line player-line" />
        <circle cx="570" cy={pointY} r="6" className="chart-point" />
      </svg>
      <div className="chart-x-axis" aria-hidden="true"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>
    </figure>
  );
}

export function Dashboard() {
  const [period, setPeriod] = useState<Period>('Semana');
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [riotAccount, setRiotAccount] = useState<RiotAccountRow | null>(null);
  const [snapshot, setSnapshot] = useState<RankedSnapshotRow | null>(null);
  const [riotSummary, setRiotSummary] = useState<RiotSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        setLoading(false);
        return;
      }

      // 1. Cargar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileData) setProfile(profileData);

      // 2. Cargar cuenta principal de Riot
      const { data: accountData } = await supabase
        .from('riot_accounts')
        .select('*')
        .eq('profile_id', userData.user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (accountData) {
        setRiotAccount(accountData);

        // 3. Cargar último snapshot competitivo
        const { data: snapshotData } = await supabase
          .from('ranked_snapshots')
          .select('*')
          .eq('riot_account_id', accountData.id)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (snapshotData) {
          setSnapshot(snapshotData);
        }

        // 4. Cargar resumen enriquecido de Riot Games (splash art, profile icon, top champion)
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const summaryRes = await fetch('/api/riot/summary', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (summaryRes.ok) {
              const summaryJson = await summaryRes.json();
              setRiotSummary(summaryJson);
            }
          }
        } catch {
          // Si falla, se muestra la vista estándar
        }
      }

      setLoading(false);
    }

    void loadData();
  }, []);

  const displayName = riotAccount ? riotAccount.game_name : profile?.display_name || 'Invocador';
  const tagLine = riotAccount ? `#${riotAccount.tag_line}` : '#LAN';
  const initials = displayName.slice(0, 2).toUpperCase();

  const rankTier = snapshot?.tier || 'UNRANKED';
  const rankDivision = snapshot?.division || '';
  const rankName = formatTierName(rankTier, rankDivision);
  const rankInitials = getRankInitials(rankDivision);
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
            <button className="icon-button notification-button" type="button" aria-label="Ver notificaciones"><Bell size={20} weight="bold" /><span className="notification-dot" /></button>
            <ThemeToggle />
            <div className="mini-profile" aria-label={`Perfil de ${displayName}`}>
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
            </div>
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
                    alt={`Ícono de invocador de ${displayName}`}
                    width={82}
                    height={82}
                  />
                  <span className="profile-banner-level">NVL {riotSummary.summonerLevel}</span>
                </div>
                <div className="profile-banner-info">
                  <h2 className="profile-banner-name">
                    {displayName}
                    <span className="profile-banner-tag">{tagLine} ({riotSummary.platform})</span>
                  </h2>
                  <div className="profile-banner-meta">
                    <span className="profile-badge profile-badge-accent">{rankName}</span>
                    <span className="profile-badge">{lp} LP</span>
                    <span className="profile-badge">
                      {totalGames > 0 ? `${wins}V - ${losses}D (${winRate}%)` : 'Solo/Duo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-banner-right">
                <div className="mastery-card">
                  <Flame size={28} weight="fill" style={{ color: 'var(--accent-bright)' }} />
                  <div>
                    <small>Campeón Principal</small>
                    <strong>{riotSummary.topChampion.name} · {riotSummary.topChampion.points.toLocaleString()} PTS</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="profile-hero" aria-labelledby="profile-name">
            <div className="rank-emblem" aria-hidden="true">
              <ShieldChevron size={66} weight="fill" />
              <span>{rankInitials}</span>
            </div>
            <div className="profile-copy">
              <p className="eyebrow">Invocador principal</p>
              <h2 id="profile-name">{displayName}<span>{tagLine}</span></h2>
              <div className="rank-line">
                <strong>{rankName}</strong>
                <span>{lp} LP</span>
                <span className="positive">{totalGames > 0 ? `${wins}V - ${losses}D (${winRate}%)` : 'Sin partidas registradas'}</span>
              </div>
            </div>
            <div className="season-goal">
              <span className="eyebrow">Objetivo de temporada</span><strong>Esmeralda IV</strong>
              <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(10, winRate))}%` }} /></div>
              <small>{winRate}% win rate en clasificatorias</small>
            </div>
          </section>
        )}

        <section className="metrics" aria-label="Métricas principales">
          <article className="metric metric-featured">
            <span className="metric-label">LP actuales</span>
            <strong>{lp} LP</strong>
            <small>{rankTier !== 'UNRANKED' ? rankName : 'Solo/Duo'}</small>
          </article>
          <article className="metric">
            <span className="metric-label">Partidas</span>
            <strong>{totalGames}</strong>
            <small>Solo/Duo 2026</small>
          </article>
          <article className="metric">
            <span className="metric-label">Victorias</span>
            <strong>{wins}</strong>
            <small>{losses} derrotas</small>
          </article>
          <article className="metric">
            <span className="metric-label">Win rate</span>
            <strong>{winRate}%</strong>
            <small className={winRate >= 50 ? 'positive' : ''}>{wins} de {totalGames} ganadas</small>
          </article>
        </section>

        <div className="dashboard-grid">
          <section className="panel performance-panel" aria-labelledby="performance-title">
            <div className="panel-heading">
              <div><p className="eyebrow">Cara a cara</p><h2 id="performance-title">Progreso de LP</h2></div>
              <div className="period-tabs" role="group" aria-label="Seleccionar periodo">
                {periods.map((item) => <button key={item} type="button" className={period === item ? 'is-active' : ''} onClick={() => setPeriod(item)} aria-pressed={period === item}>{item}</button>)}
              </div>
            </div>
            <div className="chart-legend">
              <span><i className="legend-player" /> Tú <strong>{lp} LP</strong></span>
              <span><i className="legend-rival" /> Kuro <strong>+112 LP</strong></span>
            </div>
            <PerformanceChart period={period} />
          </section>

          <section className="panel leaderboard-panel" aria-labelledby="leaderboard-title">
            <div className="panel-heading compact"><div><p className="eyebrow">Tu círculo</p><h2 id="leaderboard-title">Clasificación</h2></div><Trophy size={27} weight="fill" /></div>
            <ol className="friends-list">
              <li className="current-user">
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
            <Link href="/clasificacion" className="text-button">Ver clasificación completa →</Link>
          </section>

          <section className="panel challenge-panel" aria-labelledby="challenge-title">
            <div className="challenge-symbol"><Crosshair size={42} weight="bold" /></div>
            <div className="challenge-info"><p className="eyebrow">Reto activo / 12 días restantes</p><h2 id="challenge-title">Road to Emerald</h2><p>El primero en alcanzar Esmeralda IV gana. Cuatro amigos, una sola meta.</p></div>
            <div className="challenge-progress"><div><span>Tu progreso</span><strong>{lp > 0 ? `${lp} LP` : '0%'}</strong></div><div className="progress-track large"><span style={{ width: `${Math.min(100, Math.max(5, lp))}%` }} /></div><small><Check size={15} weight="bold" /> {lp} LP acumulados</small></div>
            <Link href="/retos" className="secondary-button">Ver reto</Link>
          </section>
        </div>
      </main>
    </div>
  );
}
