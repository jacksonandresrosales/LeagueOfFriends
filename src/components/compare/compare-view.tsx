'use client';

import {
  ArrowsLeftRight,
  CaretDown,
  Flame,
  ShieldChevron,
  Sword,
  Trophy,
  User,
  UsersThree,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { formatTierName, getRankInitials } from '@/lib/riot/format';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Period = 'Día' | 'Semana' | 'Mes';
const periods: Period[] = ['Día', 'Semana', 'Mes'];

type RankedSnapshotRow = Database['public']['Tables']['ranked_snapshots']['Row'];
type RiotAccountRow = Database['public']['Tables']['riot_accounts']['Row'];

interface FriendOption {
  id: string;
  displayName: string;
  riotAccount?: RiotAccountRow | null;
  latestSnapshot?: RankedSnapshotRow | null;
}

interface PlayerStats {
  displayName: string;
  tagLine: string;
  tier: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  topChampionName?: string;
  topChampionPoints?: number;
  hasRiotAccount: boolean;
}

const mockDemoRival: PlayerStats = {
  displayName: 'Kuro',
  tagLine: '#EUW',
  tier: 'PLATINUM',
  division: 'III',
  lp: 78,
  wins: 19,
  losses: 11,
  totalGames: 30,
  winRate: 63,
  topChampionName: 'Yasuo',
  topChampionPoints: 642000,
  hasRiotAccount: true,
};

const periodChartData: Record<Period, { playerPath: string; rivalPath: string; playerPoints: number; rivalPoints: number; dates: string[] }> = {
  Día: {
    playerPoints: 5,
    rivalPoints: 12,
    playerPath: 'M0 176 C54 158 74 174 126 137 S211 121 263 88 S358 101 420 46 S511 58 570 24',
    rivalPath: 'M0 185 C59 177 83 144 141 151 S230 115 287 124 S374 78 428 91 S516 64 570 73',
    dates: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
  },
  Semana: {
    playerPoints: 5,
    rivalPoints: 78,
    playerPath: 'M0 181 C46 170 80 188 127 148 S210 126 264 93 S355 110 419 52 S510 63 570 25',
    rivalPath: 'M0 190 C49 181 89 146 142 158 S229 118 286 130 S372 83 429 97 S515 70 570 78',
    dates: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  },
  Mes: {
    playerPoints: 5,
    rivalPoints: 140,
    playerPath: 'M0 190 C52 179 74 160 127 171 S215 118 267 126 S355 69 421 80 S511 39 570 20',
    rivalPath: 'M0 183 C56 151 85 175 143 140 S233 150 289 104 S376 120 431 86 S516 101 570 65',
    dates: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
  },
};

export function CompareView() {
  const searchParams = useSearchParams();
  const urlFriendId = searchParams.get('friendId');

  const [period, setPeriod] = useState<Period>('Semana');
  const [currentUserStats, setCurrentUserStats] = useState<PlayerStats | null>(null);
  const [friendsList, setFriendsList] = useState<FriendOption[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>(urlFriendId || 'demo');
  const [rivalStats, setRivalStats] = useState<PlayerStats>(mockDemoRival);

  // Cargar datos del usuario logueado y lista de amigos
  useEffect(() => {
    let isMounted = true;

    async function fetchUserData() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) return;

      const userId = userData.user.id;

      // 1. Cargar perfil y cuenta de Riot del usuario actual
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      const { data: riotAccount } = await supabase
        .from('riot_accounts')
        .select('*')
        .eq('profile_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      let snap: RankedSnapshotRow | null = null;
      if (riotAccount) {
        const { data: snapData } = await supabase
          .from('ranked_snapshots')
          .select('*')
          .eq('riot_account_id', riotAccount.id)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        snap = snapData;
      }

      // 2. Cargar resumen real de Riot si tiene cuenta vinculada
      let topChampName: string | undefined;
      let topChampPoints: number | undefined;

      if (riotAccount) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const summaryRes = await fetch('/api/riot/summary', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (summaryRes.ok) {
              const summary = await summaryRes.json();
              topChampName = summary.topChampion?.name;
              topChampPoints = summary.topChampion?.points;
            }
          }
        } catch {
          // Fallback silencioso
        }
      }

      const wins = snap?.wins ?? 0;
      const losses = snap?.losses ?? 0;
      const total = wins + losses;

      if (isMounted) {
        setCurrentUserStats({
          displayName: riotAccount?.game_name || profile?.display_name || 'Invocador',
          tagLine: riotAccount ? `#${riotAccount.tag_line}` : '#LAN',
          tier: snap?.tier || 'UNRANKED',
          division: snap?.division || '',
          lp: snap?.league_points ?? 0,
          wins,
          losses,
          totalGames: total,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
          topChampionName: topChampName,
          topChampionPoints: topChampPoints,
          hasRiotAccount: !!riotAccount,
        });
      }

      // 3. Cargar amigos aceptados
      const { data: friendships } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          requester_id,
          addressee_id,
          requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url),
          addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      const friends: FriendOption[] = [];

      for (const f of friendships || []) {
        const isSender = f.requester_id === userId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const friendProfile = isSender ? (f.addressee as any) : (f.requester as any);
        if (friendProfile) {
          friends.push({
            id: friendProfile.id,
            displayName: friendProfile.display_name,
          });
        }
      }

      if (isMounted) {
        setFriendsList(friends);
        if (urlFriendId && friends.some((f) => f.id === urlFriendId)) {
          setSelectedFriendId(urlFriendId);
        }
      }
    }

    void fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [urlFriendId]);

  // Cargar datos dinámicos del rival cuando cambia selectedFriendId
  useEffect(() => {
    let isMounted = true;

    async function loadRivalData() {
      if (selectedFriendId === 'demo') {
        if (isMounted) setRivalStats(mockDemoRival);
        return;
      }

      const supabase = getSupabaseClient();

      // Cargar perfil del amigo
      const { data: friendProfile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', selectedFriendId)
        .maybeSingle();

      if (!friendProfile) {
        if (isMounted) setRivalStats(mockDemoRival);
        return;
      }

      // Cargar cuenta de Riot del amigo
      const { data: riotAccount } = await supabase
        .from('riot_accounts')
        .select('*')
        .eq('profile_id', selectedFriendId)
        .eq('is_primary', true)
        .maybeSingle();

      if (!riotAccount) {
        if (isMounted) {
          setRivalStats({
            displayName: friendProfile.display_name,
            tagLine: '#LAN',
            tier: 'UNRANKED',
            division: '',
            lp: 0,
            wins: 0,
            losses: 0,
            totalGames: 0,
            winRate: 0,
            hasRiotAccount: false,
          });
        }
        return;
      }

      // Cargar último snapshot competitivo del amigo
      const { data: snap } = await supabase
        .from('ranked_snapshots')
        .select('*')
        .eq('riot_account_id', riotAccount.id)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const wins = snap?.wins ?? 0;
      const losses = snap?.losses ?? 0;
      const total = wins + losses;

      if (isMounted) {
        setRivalStats({
          displayName: riotAccount.game_name,
          tagLine: `#${riotAccount.tag_line}`,
          tier: snap?.tier || 'UNRANKED',
          division: snap?.division || '',
          lp: snap?.league_points ?? 0,
          wins,
          losses,
          totalGames: total,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
          hasRiotAccount: true,
        });
      }
    }

    void loadRivalData();

    return () => {
      isMounted = false;
    };
  }, [selectedFriendId]);

  const p1 = currentUserStats || {
    displayName: 'Invocador',
    tagLine: '#LAN',
    tier: 'BRONZE',
    division: 'I',
    lp: 5,
    wins: 6,
    losses: 6,
    totalGames: 12,
    winRate: 50,
    hasRiotAccount: true,
  };

  const p2 = rivalStats;
  const chart = periodChartData[period];

  return (
    <div className="app-shell" id="comparar">
      <AppSidebar active="Comparar" />
      <main className="dashboard-main challenge-create-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Análisis Cara a Cara / Temporada 2026</p>
            <h1>Comparar Invocadores</h1>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
          </div>
        </header>

        <div className="challenge-intro">
          <div>
            <span className="section-index"><ArrowsLeftRight size={24} weight="bold" /></span>
            <h2>Métricas frente a frente<br />en tiempo real.</h2>
          </div>
          <p>
            Selecciona a cualquier invocador de tu círculo para contrastar puntos de liga, ritmo de victorias y rendimiento en clasificatorias.
          </p>
        </div>

        {/* Selector de Rival / Amigo */}
        <section className="panel" style={{ padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="section-index" style={{ width: '42px', height: '42px' }}><UsersThree size={22} weight="bold" /></span>
            <div>
              <strong style={{ font: '900 16px/1 var(--font-display)', textTransform: 'uppercase', display: 'block' }}>
                Seleccionar Invocador Rival
              </strong>
              <small style={{ color: 'var(--muted)', font: '700 10px/1.2 var(--font-mono)', textTransform: 'uppercase' }}>
                Compara tu progreso contra tu lista de amigos
              </small>
            </div>
          </div>

          <div style={{ position: 'relative', minWidth: '260px' }}>
            <select
              value={selectedFriendId}
              onChange={(e) => setSelectedFriendId(e.target.value)}
              style={{
                width: '100%',
                height: '46px',
                border: '2px solid var(--line)',
                background: 'var(--surface-alt)',
                color: 'var(--ink)',
                font: '800 12px var(--font-mono)',
                textTransform: 'uppercase',
                padding: '0 36px 0 14px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="demo">Kuro #EUW (Rival Demo)</option>
              {friendsList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.displayName}
                </option>
              ))}
            </select>
            <CaretDown size={18} weight="bold" style={{ position: 'absolute', right: '12px', top: '14px', pointerEvents: 'none' }} />
          </div>
        </section>

        {/* Tarjetas Cara a Cara (Versus) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {/* Jugador 1 (Tú) */}
          <article className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '12px 20px',
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                borderBottom: '3px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} weight="bold" />
                <strong style={{ font: '900 12px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Tu Invocador
                </strong>
              </div>
              <span
                style={{
                  font: '800 11px/1 var(--font-mono)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '4px 8px',
                }}
              >
                {p1.tagLine.replace('#', '')}
              </span>
            </div>

            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="rank-emblem" style={{ width: '68px', height: '68px', flexShrink: 0 }}>
                  <ShieldChevron size={52} weight="fill" />
                  <span style={{ fontSize: '15px' }}>{getRankInitials(p1.division)}</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, font: '900 24px/1 var(--font-display)', textTransform: 'uppercase' }}>
                    {p1.displayName} <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{p1.tagLine}</span>
                  </h3>
                  <p style={{ margin: '6px 0 0', font: '800 13px var(--font-mono)', textTransform: 'uppercase' }}>
                    {formatTierName(p1.tier, p1.division)} · <strong>{p1.lp} LP</strong>
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px 14px', background: 'var(--surface-alt)', border: '2px solid var(--line)', boxShadow: '2px 2px 0 var(--line)' }}>
                  <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase' }}>Win Rate</small>
                  <strong style={{ font: '900 22px/1.2 var(--font-display)' }}>{p1.winRate}%</strong>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--surface-alt)', border: '2px solid var(--line)', boxShadow: '2px 2px 0 var(--line)' }}>
                  <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase' }}>Partidas</small>
                  <strong style={{ font: '900 22px/1.2 var(--font-display)' }}>{p1.totalGames}</strong>
                </div>
              </div>
            </div>
          </article>

          {/* Jugador 2 (Rival) */}
          <article className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '12px 20px',
                background: 'var(--surface-alt)',
                color: 'var(--ink)',
                borderBottom: '3px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sword size={18} weight="bold" />
                <strong style={{ font: '900 12px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Rival / Oponente
                </strong>
              </div>
              <span
                style={{
                  font: '800 11px/1 var(--font-mono)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  padding: '4px 8px',
                }}
              >
                {p2.tagLine.replace('#', '')}
              </span>
            </div>

            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="rank-emblem" style={{ width: '68px', height: '68px', background: 'var(--ink)', color: 'var(--surface)', flexShrink: 0 }}>
                  <ShieldChevron size={52} weight="fill" />
                  <span style={{ fontSize: '15px', color: 'var(--surface)' }}>{getRankInitials(p2.division)}</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, font: '900 24px/1 var(--font-display)', textTransform: 'uppercase' }}>
                    {p2.displayName} <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{p2.tagLine}</span>
                  </h3>
                  <p style={{ margin: '6px 0 0', font: '800 13px var(--font-mono)', textTransform: 'uppercase' }}>
                    {p2.hasRiotAccount ? `${formatTierName(p2.tier, p2.division)} · ${p2.lp} LP` : 'Sin cuenta de LoL vinculada'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px 14px', background: 'var(--surface-alt)', border: '2px solid var(--line)', boxShadow: '2px 2px 0 var(--line)' }}>
                  <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase' }}>Win Rate</small>
                  <strong style={{ font: '900 22px/1.2 var(--font-display)' }}>{p2.winRate}%</strong>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--surface-alt)', border: '2px solid var(--line)', boxShadow: '2px 2px 0 var(--line)' }}>
                  <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase' }}>Partidas</small>
                  <strong style={{ font: '900 22px/1.2 var(--font-display)' }}>{p2.totalGames}</strong>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Gráfica Comparativa */}
        <section className="panel performance-panel" style={{ marginBottom: '32px' }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cara a cara</p>
              <h2>Evolución de Puntos de Liga (LP)</h2>
            </div>
            <div className="neo-tabs">
              {periods.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={period === item ? 'is-active' : ''}
                  onClick={() => setPeriod(item)}
                  style={{ minHeight: '38px', padding: '0 16px', fontSize: '10px' }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-legend" style={{ margin: '20px 0 10px 0' }}>
            <span><i className="legend-player" /> {p1.displayName} <strong>{p1.lp} LP</strong></span>
            <span><i className="legend-rival" /> {p2.displayName} <strong>{p2.lp} LP</strong></span>
          </div>

          <figure className="chart" aria-label={`Evolución comparativa durante el periodo: ${period}`}>
            <div className="chart-y-axis" aria-hidden="true">
              <span>+160</span><span>+120</span><span>+80</span><span>+40</span><span>0</span>
            </div>
            <svg viewBox="0 0 570 210" role="img" aria-labelledby="chart-title chart-description" preserveAspectRatio="none">
              <title id="chart-title">Comparativa de puntos de liga</title>
              <desc id="chart-description">Evolución de {p1.displayName} vs {p2.displayName}.</desc>
              {[20, 62, 104, 146, 188].map((y) => <line key={y} x1="0" y1={y} x2="570" y2={y} className="grid-line" />)}
              <path d={chart.rivalPath} className="chart-line rival-line" />
              <path d={chart.playerPath} className="chart-line player-line" />
              <circle cx="570" cy={period === 'Día' ? 24 : 25} r="6" className="chart-point" />
            </svg>
            <div className="chart-x-axis" aria-hidden="true">
              {chart.dates.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </figure>
        </section>

        {/* Tabla Comparativa Directa (Head to Head Breakdown) */}
        <section className="panel" style={{ padding: '24px' }}>
          <div className="panel-heading compact" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">Desglose Detallado</p>
              <h2>Comparativa Directa</h2>
            </div>
            <Trophy size={28} weight="fill" />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '800 13px/1 var(--font-mono)' }}>
              <thead>
                <tr style={{ borderBottom: '3px solid var(--line)', background: 'var(--surface-alt)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>MÉTRICA</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{p1.displayName}</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p2.displayName}</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>VENTAJA</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>RANGO Y DIVISIÓN</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatTierName(p1.tier, p1.division)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p2.hasRiotAccount ? formatTierName(p2.tier, p2.division) : 'Sin clasificar'}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span className="profile-badge">{p1.lp >= p2.lp ? p1.displayName : p2.displayName}</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>PUNTOS DE LIGA (LP)</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p1.lp} LP</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p2.lp} LP</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span className="profile-badge profile-badge-accent">
                      {p1.lp >= p2.lp ? `+${p1.lp - p2.lp} LP (${p1.displayName})` : `+${p2.lp - p1.lp} LP (${p2.displayName})`}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>WIN RATE EN CLASIFICATORIAS</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p1.winRate}%</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p2.winRate}%</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span className="profile-badge">
                      {p1.winRate >= p2.winRate ? `+${p1.winRate - p2.winRate}% (${p1.displayName})` : `+${p2.winRate - p1.winRate}% (${p2.displayName})`}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '2px solid var(--line)' }}>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>BALANCE DE VICTORIAS</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p1.wins}V - {p1.losses}D</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p2.wins}V - {p2.losses}D</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span className="profile-badge">
                      {p1.wins >= p2.wins ? `${p1.displayName} (+${p1.wins - p2.wins} V)` : `${p2.displayName} (+${p2.wins - p1.wins} V)`}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>CAMPEÓN MÁS JUGADO</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p1.topChampionName || 'Sin datos'}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{p2.topChampionName || 'Sin datos'}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {p1.topChampionName ? (
                      <span className="profile-badge profile-badge-accent">
                        <Flame size={14} weight="fill" />
                        <span>{p1.topChampionName} {p1.topChampionPoints ? `(${Math.round(p1.topChampionPoints / 1000)}k PTS)` : ''}</span>
                      </span>
                    ) : (
                      <span className="profile-badge">-</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
