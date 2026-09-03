/* eslint-disable @next/next/no-img-element */
'use client';

import {
  ArrowsLeftRight,
  CaretDown,
  ChartLineUp,
  Crown,
  Flame,
  Medal,
  MagnifyingGlass,
  ShieldChevron,
  Sword,
  Trophy,
  UsersThree,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppFooter } from '@/components/shared/app-footer';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { AppTopbar } from '@/components/shared/app-topbar';
import { formatTierName } from '@/lib/riot/format';
import { getSupabaseClient } from '@/lib/supabase/client';

type SortOption = 'lp' | 'winRate' | 'games';
type TierFilter = 'all' | 'emerald_plus' | 'platinum_plus' | 'gold_plus';
type ScopeOption = 'friends' | 'all';

interface RankedEntry {
  id: string;
  isCurrentUser: boolean;
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
  profileIconUrl?: string;
  splashArtUrl?: string;
  summonerLevel?: number;
  hasRiotAccount: boolean;
  isFriend?: boolean;
}

const tierRankValues: Record<string, number> = {
  CHALLENGER: 9000,
  GRANDMASTER: 8000,
  MASTER: 7000,
  DIAMOND: 6000,
  EMERALD: 5000,
  PLATINUM: 4000,
  GOLD: 3000,
  SILVER: 2000,
  BRONZE: 1000,
  IRON: 0,
  UNRANKED: -1000,
};

const divisionRankValues: Record<string, number> = {
  I: 400,
  II: 300,
  III: 200,
  IV: 100,
};

function calculateTotalScore(entry: RankedEntry): number {
  const tierVal = tierRankValues[entry.tier.toUpperCase()] ?? 0;
  const divVal = divisionRankValues[entry.division.toUpperCase()] ?? 0;
  return tierVal + divVal + entry.lp;
}

export function LeaderboardView() {
  const [scope, setScope] = useState<ScopeOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('lp');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [players, setPlayers] = useState<RankedEntry[]>([]);

  // Cargar exclusivamente datos reales de la base de datos y Riot Games
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const supabase = getSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();

      const entries: RankedEntry[] = [];

      if (userData?.user) {
        const userId = userData.user.id;

        // 1. Cargar resumen enriquecido del usuario actual (Riot)
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        const { data: myRiot } = await supabase
          .from('riot_accounts')
          .select('*')
          .eq('profile_id', userId)
          .eq('is_primary', true)
          .maybeSingle();

        let myTopChampName: string | undefined;
        let myTopChampPoints: number | undefined;
        let myProfileIconUrl: string | undefined;
        let mySplashArtUrl: string | undefined;
        let mySummonerLevel: number | undefined;

        if (myRiot) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (token) {
              const res = await fetch('/api/riot/summary', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const s = await res.json();
                myTopChampName = s.topChampion?.name;
                myTopChampPoints = s.topChampion?.points;
                myProfileIconUrl = s.profileIconUrl;
                mySplashArtUrl = s.splashArtUrl;
                mySummonerLevel = s.summonerLevel;
              }
            }
          } catch {
            // Fallback silencioso
          }
        }

        // 2. Cargar amigos aceptados del usuario actual
        const { data: friendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

        const friendIds = new Set<string>();
        for (const f of friendships || []) {
          friendIds.add(f.requester_id === userId ? f.addressee_id : f.requester_id);
        }

        // 3. Cargar todos los perfiles reales registrados en la base de datos
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url');

        // 4. Cargar todas las cuentas Riot principales vinculadas
        const { data: allRiotAccounts } = await supabase
          .from('riot_accounts')
          .select('id, profile_id, game_name, tag_line, platform_route')
          .eq('is_primary', true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const riotMap = new Map<string, any>((allRiotAccounts || []).map((r) => [r.profile_id, r]));

        // 5. Cargar los últimos snapshots reales de ranked
        const riotAccountIds = (allRiotAccounts || []).map((r) => r.id);
        const { data: allSnapshots } = riotAccountIds.length > 0
          ? await supabase
              .from('ranked_snapshots')
              .select('*')
              .in('riot_account_id', riotAccountIds)
              .order('captured_at', { ascending: false })
          : { data: [] };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const snapMap = new Map<number, any>();
        for (const s of allSnapshots || []) {
          if (!snapMap.has(s.riot_account_id)) {
            snapMap.set(s.riot_account_id, s);
          }
        }

        // 6. Construir la lista 100% con usuarios reales
        for (const prof of allProfiles || []) {
          const isCurrentUser = prof.id === userId;
          const isFriend = friendIds.has(prof.id);
          const riot = isCurrentUser ? myRiot : riotMap.get(prof.id);
          const snap = riot ? snapMap.get(riot.id) : null;

          const wins = snap?.wins ?? 0;
          const losses = snap?.losses ?? 0;
          const total = wins + losses;
          const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

          entries.push({
            id: prof.id,
            isCurrentUser,
            displayName: isCurrentUser
              ? (myRiot?.game_name || profile?.display_name || prof.display_name || 'Tú')
              : (riot?.game_name || prof.display_name || 'Invocador'),
            tagLine: isCurrentUser
              ? (myRiot ? `#${myRiot.tag_line}` : '#LAN')
              : (riot ? `#${riot.tag_line}` : '#LAN'),
            tier: snap?.tier || 'UNRANKED',
            division: snap?.division || '',
            lp: snap?.league_points ?? 0,
            wins,
            losses,
            totalGames: total,
            winRate,
            topChampionName: isCurrentUser ? myTopChampName : undefined,
            topChampionPoints: isCurrentUser ? myTopChampPoints : undefined,
            profileIconUrl: isCurrentUser ? myProfileIconUrl : prof.avatar_url || undefined,
            splashArtUrl: isCurrentUser ? mySplashArtUrl : undefined,
            summonerLevel: isCurrentUser ? mySummonerLevel : undefined,
            hasRiotAccount: isCurrentUser ? !!myRiot : !!riot,
            isFriend,
          });
        }
      }

      if (isMounted) {
        setPlayers(entries);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtrado y ordenamiento de la tabla
  const filteredAndSortedPlayers = useMemo(() => {
    let result = [...players];

    // Filtro por ámbito (Solo amigos vs LAN general)
    if (scope === 'friends') {
      result = result.filter((p) => p.isCurrentUser || p.isFriend);
    }

    // Filtro de búsqueda por nombre
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) => p.displayName.toLowerCase().includes(q) || p.tagLine.toLowerCase().includes(q),
      );
    }

    // Filtro por rango
    if (tierFilter === 'emerald_plus') {
      const tiers = ['EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
      result = result.filter((p) => tiers.includes(p.tier.toUpperCase()));
    } else if (tierFilter === 'platinum_plus') {
      const tiers = ['PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
      result = result.filter((p) => tiers.includes(p.tier.toUpperCase()));
    } else if (tierFilter === 'gold_plus') {
      const tiers = ['GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
      result = result.filter((p) => tiers.includes(p.tier.toUpperCase()));
    }

    // Ordenamiento
    result.sort((a, b) => {
      if (sortBy === 'lp') {
        return calculateTotalScore(b) - calculateTotalScore(a);
      }
      if (sortBy === 'winRate') {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.totalGames - a.totalGames;
      }
      if (sortBy === 'games') {
        return b.totalGames - a.totalGames;
      }
      return 0;
    });

    return result;
  }, [players, searchQuery, tierFilter, sortBy, scope]);

  const top3 = filteredAndSortedPlayers.slice(0, 3);
  const currentUserPosition = filteredAndSortedPlayers.findIndex((p) => p.isCurrentUser) + 1;

  return (
    <div className="app-shell" id="clasificacion">
      <AppSidebar active="Clasificación" />
      <main className="dashboard-main challenge-create-main">
        <AppTopbar category="Temporada 2026 / Ranking de Invocadores" title="Tabla de Clasificación" />

        {/* Intro */}
        <div className="challenge-intro">
          <div>
            <span className="section-index"><Trophy size={24} weight="bold" /></span>
            <h2>El trono de la grieta<br />en disputa.</h2>
          </div>
          <p>
            Sigue la tabla de posiciones en tiempo real, mide la distancia con tus rivales y compite por alcanzar la cima del ranking.
          </p>
        </div>

        {/* PODIO DE LOS TOP 3 INVOCADORES */}
        {top3.length >= 3 && !searchQuery ? (
          <section style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <Crown size={24} weight="fill" color="var(--accent-bright)" />
              <h2 style={{ margin: 0, font: '900 20px/1 var(--font-display)', textTransform: 'uppercase' }}>
                Podio de Honor
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                alignItems: 'end',
              }}
            >
              {/* 2º LUGAR (Plata) */}
              <article
                className="panel"
                style={{
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundImage: top3[1]?.splashArtUrl ? `url(${top3[1].splashArtUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 20%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.94) 100%)',
                    zIndex: 1,
                  }}
                />

                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: '10px 18px',
                    background: 'var(--surface-alt)',
                    color: 'var(--ink)',
                    borderBottom: '3px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Medal size={20} weight="fill" color="#a0aec0" />
                    <strong style={{ font: '900 12px/1 var(--font-mono)', textTransform: 'uppercase' }}>
                      #2 Segundo Lugar
                    </strong>
                  </div>
                  <span style={{ font: '800 11px/1 var(--font-mono)', background: 'rgba(0, 0, 0, 0.4)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '3px 8px' }}>
                    {top3[1]?.tagLine.replace('#', '')}
                  </span>
                </div>

                <div style={{ position: 'relative', zIndex: 2, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '58px',
                        height: '58px',
                        flexShrink: 0,
                        border: '3px solid var(--line)',
                        boxShadow: '3px 3px 0 var(--line)',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                      }}
                    >
                      {top3[1]?.profileIconUrl ? (
                        <img src={top3[1].profileIconUrl} alt="" width={58} height={58} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="rank-emblem" style={{ width: '100%', height: '100%', border: 'none', boxShadow: 'none' }}>
                          <ShieldChevron size={38} weight="fill" />
                        </div>
                      )}
                      {top3[1]?.summonerLevel ? <span className="profile-banner-level">NVL {top3[1].summonerLevel}</span> : null}
                    </div>

                    <div>
                      <h3 style={{ margin: 0, font: '900 20px/1 var(--font-display)', color: '#fff', textTransform: 'uppercase' }}>
                        {top3[1]?.displayName}
                      </h3>
                      <p style={{ margin: '4px 0 0', font: '800 12px var(--font-mono)', color: '#ddd', textTransform: 'uppercase' }}>
                        {formatTierName(top3[1]?.tier || '', top3[1]?.division || '')} · <strong>{top3[1]?.lp} LP</strong>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ padding: '8px 10px', background: 'rgba(0, 0, 0, 0.75)', border: '2px solid var(--line)' }}>
                      <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: '#aaa', textTransform: 'uppercase' }}>Win Rate</small>
                      <strong style={{ font: '900 18px/1 var(--font-display)', color: '#fff' }}>{top3[1]?.winRate}%</strong>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'rgba(0, 0, 0, 0.75)', border: '2px solid var(--line)' }}>
                      <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: '#aaa', textTransform: 'uppercase' }}>Partidas</small>
                      <strong style={{ font: '900 18px/1 var(--font-display)', color: '#fff' }}>{top3[1]?.totalGames}</strong>
                    </div>
                  </div>
                </div>
              </article>

              {/* 1º LUGAR (Oro / Destacado Central) */}
              <article
                className="panel"
                style={{
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundImage: top3[0]?.splashArtUrl ? `url(${top3[0].splashArtUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 20%',
                  borderWidth: '4px',
                  boxShadow: '8px 8px 0 var(--line)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0.94) 100%)',
                    zIndex: 1,
                  }}
                />

                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: '14px 20px',
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                    borderBottom: '3px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crown size={22} weight="fill" color="#ffd700" />
                    <strong style={{ font: '900 14px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      #1 Campeón de la Temporada
                    </strong>
                  </div>
                  <span style={{ font: '800 11px/1 var(--font-mono)', background: 'rgba(0, 0, 0, 0.4)', color: '#fff', padding: '3px 8px', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                    {top3[0]?.tagLine.replace('#', '')}
                  </span>
                </div>

                <div style={{ position: 'relative', zIndex: 2, padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '74px',
                        height: '74px',
                        flexShrink: 0,
                        border: '3px solid var(--line)',
                        boxShadow: '4px 4px 0 var(--line)',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                      }}
                    >
                      {top3[0]?.profileIconUrl ? (
                        <img src={top3[0].profileIconUrl} alt="" width={74} height={74} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="rank-emblem" style={{ width: '100%', height: '100%', border: 'none', boxShadow: 'none' }}>
                          <ShieldChevron size={48} weight="fill" />
                        </div>
                      )}
                      {top3[0]?.summonerLevel ? <span className="profile-banner-level">NVL {top3[0].summonerLevel}</span> : null}
                    </div>

                    <div>
                      <h3 style={{ margin: 0, font: '900 24px/1 var(--font-display)', color: '#fff', textTransform: 'uppercase', textShadow: '2px 2px 0 #000' }}>
                        {top3[0]?.displayName}
                      </h3>
                      <p style={{ margin: '6px 0 0', font: '800 13px var(--font-mono)', color: '#eee', textTransform: 'uppercase' }}>
                        {formatTierName(top3[0]?.tier || '', top3[0]?.division || '')} · <strong style={{ color: '#fff' }}>{top3[0]?.lp} LP</strong>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '10px 12px', background: 'rgba(0, 0, 0, 0.78)', border: '2px solid var(--line)' }}>
                      <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: '#aaa', textTransform: 'uppercase' }}>Win Rate</small>
                      <strong style={{ font: '900 22px/1.1 var(--font-display)', color: '#fff' }}>{top3[0]?.winRate}%</strong>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'rgba(0, 0, 0, 0.78)', border: '2px solid var(--line)' }}>
                      <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: '#aaa', textTransform: 'uppercase' }}>Partidas</small>
                      <strong style={{ font: '900 22px/1.1 var(--font-display)', color: '#fff' }}>{top3[0]?.totalGames}</strong>
                    </div>
                  </div>
                </div>
              </article>

              {/* 3º LUGAR (Bronce) */}
              <article
                className="panel"
                style={{
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundImage: top3[2]?.splashArtUrl ? `url(${top3[2].splashArtUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 20%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.94) 100%)',
                    zIndex: 1,
                  }}
                />

                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: '10px 18px',
                    background: 'var(--surface-alt)',
                    color: 'var(--ink)',
                    borderBottom: '3px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Medal size={20} weight="fill" color="#cd7f32" />
                    <strong style={{ font: '900 12px/1 var(--font-mono)', textTransform: 'uppercase' }}>
                      #3 Tercer Lugar
                    </strong>
                  </div>
                  <span style={{ font: '800 11px/1 var(--font-mono)', background: 'rgba(0, 0, 0, 0.4)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '3px 8px' }}>
                    {top3[2]?.tagLine.replace('#', '')}
                  </span>
                </div>

                <div style={{ position: 'relative', zIndex: 2, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '58px',
                        height: '58px',
                        flexShrink: 0,
                        border: '3px solid var(--line)',
                        boxShadow: '3px 3px 0 var(--line)',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                      }}
                    >
                      {top3[2]?.profileIconUrl ? (
                        <img src={top3[2].profileIconUrl} alt="" width={58} height={58} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="rank-emblem" style={{ width: '100%', height: '100%', border: 'none', boxShadow: 'none' }}>
                          <ShieldChevron size={38} weight="fill" />
                        </div>
                      )}
                      {top3[2]?.summonerLevel ? <span className="profile-banner-level">NVL {top3[2].summonerLevel}</span> : null}
                    </div>

                    <div>
                      <h3 style={{ margin: 0, font: '900 20px/1 var(--font-display)', color: '#fff', textTransform: 'uppercase' }}>
                        {top3[2]?.displayName}
                      </h3>
                      <p style={{ margin: '4px 0 0', font: '800 12px var(--font-mono)', color: '#ddd', textTransform: 'uppercase' }}>
                        {formatTierName(top3[2]?.tier || '', top3[2]?.division || '')} · <strong>{top3[2]?.lp} LP</strong>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ padding: '8px 10px', background: 'rgba(0, 0, 0, 0.75)', border: '2px solid var(--line)' }}>
                      <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: '#aaa', textTransform: 'uppercase' }}>Win Rate</small>
                      <strong style={{ font: '900 18px/1 var(--font-display)', color: '#fff' }}>{top3[2]?.winRate}%</strong>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'rgba(0, 0, 0, 0.75)', border: '2px solid var(--line)' }}>
                      <small style={{ display: 'block', font: '700 9px var(--font-mono)', color: '#aaa', textTransform: 'uppercase' }}>Partidas</small>
                      <strong style={{ font: '900 18px/1 var(--font-display)', color: '#fff' }}>{top3[2]?.totalGames}</strong>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {/* BARRA DE FILTROS Y CONTROLES */}
        <section className="panel" style={{ padding: '20px 24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Pestañas de Ámbito */}
            <div className="neo-tabs">
              <button
                type="button"
                className={scope === 'all' ? 'is-active' : ''}
                onClick={() => setScope('all')}
                style={{ minHeight: '38px', padding: '0 18px', fontSize: '11px' }}
              >
                <UsersThree size={16} weight="bold" style={{ marginRight: '6px' }} />
                General (LAN)
              </button>
              <button
                type="button"
                className={scope === 'friends' ? 'is-active' : ''}
                onClick={() => setScope('friends')}
                style={{ minHeight: '38px', padding: '0 18px', fontSize: '11px' }}
              >
                <Trophy size={16} weight="bold" style={{ marginRight: '6px' }} />
                Solo Amigos
              </button>
            </div>

            {/* Buscador de Invocador */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px', maxWidth: '340px' }}>
              <div
                style={{
                  width: '100%',
                  height: '42px',
                  border: '2px solid var(--line)',
                  background: 'var(--surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  gap: '8px',
                }}
              >
                <MagnifyingGlass size={18} weight="bold" color="var(--muted)" />
                <input
                  type="text"
                  placeholder="Buscar en la tabla..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ink)',
                    font: '800 12px var(--font-mono)',
                    width: '100%',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Selectores de Orden y Rango */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{
                    height: '42px',
                    border: '2px solid var(--line)',
                    background: 'var(--surface-alt)',
                    color: 'var(--ink)',
                    font: '800 11px var(--font-mono)',
                    textTransform: 'uppercase',
                    padding: '0 32px 0 12px',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="lp">Ordenar: Puntos de Liga (LP)</option>
                  <option value="winRate">Ordenar: Win Rate</option>
                  <option value="games">Ordenar: Partidas Jugadas</option>
                </select>
                <CaretDown size={14} weight="bold" style={{ position: 'absolute', right: '10px', top: '14px', pointerEvents: 'none' }} />
              </div>

              <div style={{ position: 'relative' }}>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as TierFilter)}
                  style={{
                    height: '42px',
                    border: '2px solid var(--line)',
                    background: 'var(--surface-alt)',
                    color: 'var(--ink)',
                    font: '800 11px var(--font-mono)',
                    textTransform: 'uppercase',
                    padding: '0 32px 0 12px',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">Filtro: Todas las divisiones</option>
                  <option value="emerald_plus">Esmeralda o superior</option>
                  <option value="platinum_plus">Platino o superior</option>
                  <option value="gold_plus">Oro o superior</option>
                </select>
                <CaretDown size={14} weight="bold" style={{ position: 'absolute', right: '10px', top: '14px', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </section>

        {/* TABLA DE POSICIONES COMPLETA */}
        <section className="panel" style={{ padding: '24px', marginBottom: '32px' }}>
          <div className="panel-heading compact" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">Tabla General</p>
              <h2>Posiciones de la Temporada ({filteredAndSortedPlayers.length})</h2>
            </div>
            <ChartLineUp size={28} weight="fill" />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '800 13px/1 var(--font-mono)' }}>
              <thead>
                <tr style={{ borderBottom: '3px solid var(--line)', background: 'var(--surface-alt)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'center', width: '60px' }}>#</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left' }}>INVOCADOR</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>RANGO / DIVISIÓN</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>LP</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>WIN RATE</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>RÉCORD (V - D)</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>CAMPEÓN TOP</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
                      <Trophy size={40} weight="duotone" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                      <strong style={{ display: 'block', font: '900 16px/1.2 var(--font-display)', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '6px' }}>
                        No hay invocadores registrados para este filtro
                      </strong>
                      <p style={{ margin: 0, font: '700 12px var(--font-mono)' }}>
                        {scope === 'friends' ? 'Añade amigos en la sección Amigos para verlos aquí.' : 'Los jugadores aparecerán aquí conforme se registren y vinculen su Riot ID.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedPlayers.map((player, idx) => {
                    const rankNumber = idx + 1;
                    const isTop1 = rankNumber === 1;
                    const isTop2 = rankNumber === 2;
                    const isTop3 = rankNumber === 3;

                    return (
                      <tr
                        key={player.id}
                        style={{
                          borderBottom: '2px solid var(--line)',
                          background: player.isCurrentUser ? 'color-mix(in oklch, var(--accent) 12%, var(--surface))' : 'transparent',
                          transition: 'background-color 140ms ease',
                        }}
                      >
                      {/* Posición */}
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            border: '2px solid var(--line)',
                            background: isTop1
                              ? 'var(--accent)'
                              : isTop2
                                ? 'var(--surface-alt)'
                                : isTop3
                                  ? 'var(--surface)'
                                  : 'var(--surface)',
                            color: isTop1 ? 'var(--on-accent)' : 'var(--ink)',
                            font: '900 13px/1 var(--font-display)',
                            boxShadow: '2px 2px 0 var(--line)',
                          }}
                        >
                          {rankNumber}
                        </span>
                      </td>

                      {/* Invocador */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              position: 'relative',
                              width: '42px',
                              height: '42px',
                              flexShrink: 0,
                              border: '2px solid var(--line)',
                              boxShadow: '2px 2px 0 var(--line)',
                              background: 'var(--surface)',
                              overflow: 'hidden',
                            }}
                          >
                            {player.profileIconUrl ? (
                              <img src={player.profileIconUrl} alt="" width={42} height={42} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div className="rank-emblem" style={{ width: '100%', height: '100%', border: 'none', boxShadow: 'none' }}>
                                <ShieldChevron size={24} weight="fill" />
                              </div>
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ font: '900 15px/1 var(--font-display)', textTransform: 'uppercase' }}>
                                {player.displayName}
                              </strong>
                              <span style={{ font: '700 11px var(--font-mono)', color: 'var(--muted)' }}>
                                {player.tagLine}
                              </span>
                              {player.isCurrentUser ? (
                                <span className="profile-badge profile-badge-accent" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                  TÚ
                                </span>
                              ) : null}
                            </div>
                            {player.summonerLevel ? (
                              <small style={{ font: '700 10px var(--font-mono)', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                                NVL {player.summonerLevel}
                              </small>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Rango / División */}
                      <td style={{ padding: '16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className="profile-badge">
                          {formatTierName(player.tier, player.division)}
                        </span>
                      </td>

                      {/* LP */}
                      <td style={{ padding: '16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <strong style={{ font: '900 16px/1 var(--font-display)', color: isTop1 ? 'var(--accent-bright)' : 'var(--ink)' }}>
                          {player.lp} LP
                        </strong>
                      </td>

                      {/* Win Rate */}
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '80px' }}>
                          <strong style={{ font: '900 14px/1 var(--font-display)' }}>
                            {player.winRate}%
                          </strong>
                          <div style={{ width: '100%', height: '6px', background: 'var(--line)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${player.winRate}%`,
                                height: '100%',
                                background: player.winRate >= 60 ? 'var(--accent-bright)' : player.winRate >= 50 ? 'var(--accent)' : 'var(--muted)',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Récord */}
                      <td style={{ padding: '16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span>
                          <strong style={{ color: 'var(--accent-bright)' }}>{player.wins}V</strong> - <strong style={{ color: 'var(--muted)' }}>{player.losses}D</strong>
                        </span>
                        <small style={{ display: 'block', font: '700 10px var(--font-mono)', color: 'var(--muted)', marginTop: '4px' }}>
                          ({player.totalGames} partidas)
                        </small>
                      </td>

                      {/* Campeón Top */}
                      <td style={{ padding: '16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {player.topChampionName ? (
                          <span className="profile-badge profile-badge-accent" style={{ fontSize: '10px' }}>
                            <Flame size={12} weight="fill" />
                            <span>{player.topChampionName}</span>
                          </span>
                        ) : (
                          <span className="profile-badge" style={{ opacity: 0.6 }}>-</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {player.isCurrentUser ? (
                          <Link href="/" className="secondary-button" style={{ minHeight: '34px', padding: '0 12px', fontSize: '10px', display: 'inline-flex', textDecoration: 'none' }}>
                            Tu Perfil
                          </Link>
                        ) : (
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Link
                              href={`/comparar?friendId=${player.id}`}
                              className="secondary-button"
                              style={{ minHeight: '34px', padding: '0 10px', fontSize: '10px', display: 'inline-flex', textDecoration: 'none' }}
                              title={`Comparar contra ${player.displayName}`}
                            >
                              <ArrowsLeftRight size={14} weight="bold" />
                              <span>Versus</span>
                            </Link>
                            <Link
                              href="/retos/nuevo"
                              className="create-button"
                              style={{ minHeight: '34px', margin: 0, padding: '0 10px', fontSize: '10px', display: 'inline-flex', textDecoration: 'none' }}
                              title={`Crear reto a ${player.displayName}`}
                            >
                              <Sword size={14} weight="bold" />
                              <span>Retar</span>
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </section>

        {/* BARRA INFERIOR DE TU POSICIÓN ACTUAL */}
        {currentUserPosition > 0 ? (
          <div
            className="panel"
            style={{
              padding: '16px 24px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              boxShadow: '4px 4px 0 var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.7)',
                  boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.5)',
                  display: 'grid',
                  placeItems: 'center',
                  font: '900 16px/1 var(--font-display)',
                }}
              >
                #{currentUserPosition}
              </span>
              <div>
                <strong style={{ font: '900 15px/1 var(--font-display)', textTransform: 'uppercase', display: 'block' }}>
                  Tu Posición Actual en el Ranking
                </strong>
                <small style={{ font: '800 11px var(--font-mono)', opacity: 0.9 }}>
                  Puesto #{currentUserPosition} de {filteredAndSortedPlayers.length} invocadores registrados
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link
                href="/retos/nuevo"
                className="secondary-button"
                style={{
                  minHeight: '38px',
                  padding: '0 16px',
                  fontSize: '11px',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                }}
              >
                <Sword size={16} weight="bold" />
                <span>Lanzar Reto para Subir</span>
              </Link>
            </div>
          </div>
        ) : null}
        <AppFooter />
      </main>
    </div>
  );
}
