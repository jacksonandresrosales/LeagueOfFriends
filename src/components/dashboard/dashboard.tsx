/* eslint-disable @next/next/no-img-element */
'use client';

import {
  ArrowRight,
  Check,
  Crosshair,
  Flame,
  GameController,
  Plus,
  ShieldChevron,
  Trophy,
  UsersThree,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppFooter } from '@/components/shared/app-footer';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { NotificationBell } from '@/components/shared/notification-bell';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { formatTierName, getRankInitials } from '@/lib/riot/format';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Period = 'Día' | 'Semana' | 'Mes';
const periods: Period[] = ['Día', 'Semana', 'Mes'];

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type RankedSnapshotRow = Database['public']['Tables']['ranked_snapshots']['Row'];
type RiotAccountRow = Database['public']['Tables']['riot_accounts']['Row'];

interface RiotSummary {
  summonerLevel: number;
  profileIconUrl: string;
  splashArtUrl: string;
  platform: string;
  topChampion: {
    name: string;
    points: number;
    level: number;
  };
}

interface FriendLeaderboardItem {
  id: string;
  name: string;
  tag: string;
  lp: number;
  profileIconUrl?: string;
  initials: string;
  isCurrentUser: boolean;
}

interface ActiveChallengeItem {
  id: number | string;
  name: string;
  metric: string;
  targetValue: number;
  daysRemaining: number;
  currentProgress: number;
  percentage: number;
}

const periodChartData: Record<Period, { points: number; path: string; dates: string[] }> = {
  Día: {
    points: 0,
    path: 'M0 188 C54 188 74 188 126 188 S211 188 263 188 S358 188 420 188 S511 188 570 188',
    dates: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
  },
  Semana: {
    points: 0,
    path: 'M0 188 C46 188 80 188 127 188 S210 188 264 188 S355 188 419 188 S510 188 570 188',
    dates: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  },
  Mes: {
    points: 0,
    path: 'M0 188 C52 188 74 188 127 188 S215 188 267 188 S355 188 421 188 S511 188 570 188',
    dates: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
  },
};

function PerformanceChart({ period }: { period: Period }) {
  const data = periodChartData[period];

  return (
    <figure className="chart" aria-label={`Evolución de LP durante el periodo: ${period}`}>
      <div className="chart-y-axis" aria-hidden="true">
        <span>+160</span>
        <span>+120</span>
        <span>+80</span>
        <span>+40</span>
        <span>0</span>
      </div>
      <svg
        viewBox="0 0 570 210"
        role="img"
        aria-labelledby="chart-title chart-description"
        preserveAspectRatio="none"
      >
        <title id="chart-title">Evolución de puntos de liga</title>
        <desc id="chart-description">Gráfico de líneas que muestra la ganancia de LP para el invocador.</desc>
        {[20, 62, 104, 146, 188].map((y) => (
          <line key={y} x1="0" y1={y} x2="570" y2={y} className="grid-line" />
        ))}
        <path d={data.path} className="chart-line player-line" />
        <circle cx="570" cy={188} r="6" className="chart-point" />
      </svg>
      <div className="chart-x-axis" aria-hidden="true">
        {data.dates.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </figure>
  );
}

export function Dashboard() {
  const [period, setPeriod] = useState<Period>('Semana');
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [riotAccount, setRiotAccount] = useState<RiotAccountRow | null>(null);
  const [snapshot, setSnapshot] = useState<RankedSnapshotRow | null>(null);
  const [riotSummary, setRiotSummary] = useState<RiotSummary | null>(null);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<FriendLeaderboardItem[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallengeItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        setLoading(false);
        return;
      }

      const userId = userData.user.id;

      // 1. Cargar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) setProfile(profileData);

      // 2. Cargar cuenta principal de Riot
      const { data: accountData } = await supabase
        .from('riot_accounts')
        .select('*')
        .eq('profile_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      let currentLp = 0;

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
          currentLp = snapshotData.league_points;
        }

        // 4. Cargar resumen enriquecido de Riot Games
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
          // Fallback silencioso
        }
      }

      // 5. Cargar ranking del círculo de amigos
      const myDisplayName = accountData?.game_name || profileData?.display_name || 'Invocador';
      const myTag = accountData ? `#${accountData.tag_line}` : '#LAN';

      const leaderboard: FriendLeaderboardItem[] = [
        {
          id: userId,
          name: myDisplayName,
          tag: myTag,
          lp: currentLp,
          initials: myDisplayName.slice(0, 2).toUpperCase(),
          isCurrentUser: true,
        },
      ];

      const { data: friendships } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          requester:profiles!friendships_requester_id_fkey(id, display_name),
          addressee:profiles!friendships_addressee_id_fkey(id, display_name)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      for (const f of friendships || []) {
        const isSender = f.requester_id === userId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const friendProfile = isSender ? (f.addressee as any) : (f.requester as any);
        if (!friendProfile) continue;

        const { data: fRiot } = await supabase
          .from('riot_accounts')
          .select('*')
          .eq('profile_id', friendProfile.id)
          .eq('is_primary', true)
          .maybeSingle();

        let fLp = 0;
        if (fRiot) {
          const { data: fSnap } = await supabase
            .from('ranked_snapshots')
            .select('league_points')
            .eq('riot_account_id', fRiot.id)
            .order('captured_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fSnap) fLp = fSnap.league_points;
        }

        const fname = fRiot?.game_name || friendProfile.display_name;
        leaderboard.push({
          id: friendProfile.id,
          name: fname,
          tag: fRiot ? `#${fRiot.tag_line}` : '#LAN',
          lp: fLp,
          initials: fname.slice(0, 2).toUpperCase(),
          isCurrentUser: false,
        });
      }

      leaderboard.sort((a, b) => b.lp - a.lp);
      setFriendsLeaderboard(leaderboard);

      // 6. Cargar reto activo
      const { data: chall } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (chall) {
        const endsDate = new Date(chall.ends_at);
        const now = new Date();
        const diffDays = Math.max(0, Math.ceil((endsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const targetVal = chall.target_value || 100;
        const progress = Math.min(targetVal, currentLp);
        const pct = targetVal > 0 ? Math.round((progress / targetVal) * 100) : 0;

        setActiveChallenge({
          id: chall.id,
          name: chall.name,
          metric: chall.metric,
          targetValue: targetVal,
          daysRemaining: diffDays,
          currentProgress: progress,
          percentage: pct,
        });
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
            <NotificationBell />
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
            </div>
            <PerformanceChart period={period} />
          </section>

          <section className="panel leaderboard-panel" aria-labelledby="leaderboard-title">
            <div className="panel-heading compact"><div><p className="eyebrow">Tu círculo</p><h2 id="leaderboard-title">Clasificación</h2></div><Trophy size={27} weight="fill" /></div>
            <ol className="friends-list">
              {friendsLeaderboard.map((item, idx) => (
                <li key={item.id} className={item.isCurrentUser ? 'current-user' : ''}>
                  <span className="place">{idx < 9 ? `0${idx + 1}` : `${idx + 1}`}</span>
                  {item.isCurrentUser && riotSummary?.profileIconUrl ? (
                    <img
                      src={riotSummary.profileIconUrl}
                      alt={item.name}
                      width={38}
                      height={38}
                      style={{ border: '2px solid var(--line)', background: 'var(--surface)' }}
                    />
                  ) : (
                    <span className="avatar avatar-red">{item.initials}</span>
                  )}
                  <span className="friend-name">
                    <strong>{item.name}</strong>
                    <small>{item.tag} {item.isCurrentUser ? '(Tú)' : ''}</small>
                  </span>
                  <strong className="friend-lp">{item.lp} LP</strong>
                </li>
              ))}
            </ol>
            {friendsLeaderboard.length <= 1 ? (
              <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--surface-alt)', border: '2px dashed var(--line)', textAlign: 'center' }}>
                <p style={{ margin: '0 0 6px', font: '700 11px var(--font-mono)', color: 'var(--muted)' }}>
                  Aún no has agregado amigos a tu círculo.
                </p>
                <Link href="/amigos" className="secondary-button" style={{ display: 'inline-flex', padding: '4px 10px', fontSize: '10px', textDecoration: 'none' }}>
                  <UsersThree size={14} weight="bold" />
                  <span>Buscar Amigos</span>
                </Link>
              </div>
            ) : null}
            <Link href="/clasificacion" className="text-button" style={{ marginTop: '12px', display: 'inline-block' }}>Ver clasificación completa →</Link>
          </section>

          <section className="panel challenge-panel" aria-labelledby="challenge-title">
            <div className="challenge-symbol"><Crosshair size={42} weight="bold" /></div>
            {activeChallenge ? (
              <>
                <div className="challenge-info">
                  <p className="eyebrow">Reto activo / {activeChallenge.daysRemaining} días restantes</p>
                  <h2 id="challenge-title">{activeChallenge.name}</h2>
                  <p>Compite en clasificatorias para alcanzar la meta antes que tus rivales.</p>
                </div>
                <div className="challenge-progress">
                  <div><span>Tu progreso</span><strong>{activeChallenge.currentProgress} / {activeChallenge.targetValue} LP</strong></div>
                  <div className="progress-track large"><span style={{ width: `${activeChallenge.percentage}%` }} /></div>
                  <small><Check size={15} weight="bold" /> {activeChallenge.percentage}% completado</small>
                </div>
                <Link href={`/retos?challengeId=${activeChallenge.id}`} className="secondary-button">Ver reto</Link>
              </>
            ) : (
              <>
                <div className="challenge-info">
                  <p className="eyebrow">Sin retos activos</p>
                  <h2 id="challenge-title">Desafía a tu Círculo</h2>
                  <p>Crea una carrera de LP o división y mide tu progreso en tiempo real.</p>
                </div>
                <Link href="/retos/nuevo" className="create-button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', margin: '14px 0 0' }}>
                  <Plus size={16} weight="bold" />
                  <span>Crear Primer Reto</span>
                </Link>
              </>
            )}
          </section>
        </div>
        <AppFooter />
      </main>
    </div>
  );
}
