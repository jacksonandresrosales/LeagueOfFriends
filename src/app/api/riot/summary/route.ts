import { NextRequest, NextResponse } from 'next/server';
import { getChampionKeyById, getSummonerByPuuid, getTopChampionMasteriesByPuuid } from '@/lib/riot/client';
import { type PlatformRoute } from '@/lib/riot/types';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    }

    const { data: riotAccount } = await supabase
      .from('riot_accounts')
      .select('*')
      .eq('profile_id', userData.user.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (!riotAccount) {
      return NextResponse.json({ error: 'No hay cuenta de Riot vinculada.' }, { status: 404 });
    }

    const platform = riotAccount.platform_route as PlatformRoute;
    const puuid = riotAccount.puuid;

    // 1. Obtener datos del invocador (icono y nivel)
    let profileIconId = 5466;
    let summonerLevel = 1;
    try {
      const summoner = await getSummonerByPuuid(puuid, platform);
      profileIconId = summoner.profileIconId;
      summonerLevel = summoner.summonerLevel;
    } catch {
      // Usar valores por defecto si Summoner-V4 no responde
    }

    // 2. Obtener maestría del campeón principal
    let topChampionName = 'Vayne';
    let championPoints = 0;
    let championLevel = 1;
    try {
      const masteries = await getTopChampionMasteriesByPuuid(puuid, platform, 1);
      if (masteries.length > 0) {
        const top = masteries[0];
        championPoints = top.championPoints;
        championLevel = top.championLevel;
        topChampionName = await getChampionKeyById(top.championId);
      }
    } catch {
      // Usar fallback
    }

    const profileIconUrl = `https://ddragon.leagueoflegends.com/cdn/15.4.1/img/profileicon/${profileIconId}.png`;
    const splashArtUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${topChampionName}_0.jpg`;

    return NextResponse.json({
      gameName: riotAccount.game_name,
      tagLine: riotAccount.tag_line,
      platform: riotAccount.platform_route.toUpperCase(),
      summonerLevel,
      profileIconId,
      profileIconUrl,
      splashArtUrl,
      topChampion: {
        name: topChampionName,
        points: championPoints,
        level: championLevel,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error al consultar resumen de Riot Games.' }, { status: 500 });
  }
}
