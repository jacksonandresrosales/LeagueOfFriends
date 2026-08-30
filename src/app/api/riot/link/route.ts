import { NextRequest, NextResponse } from 'next/server';
import { getAccountByRiotId, getLeagueEntriesByPuuid, getSummonerByPuuid, RiotApiError } from '@/lib/riot/client';
import { PLATFORM_TO_REGIONAL, type PlatformRoute } from '@/lib/riot/types';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión para vincular tu cuenta.' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { gameName, tagLine, platformRoute } = body as {
      gameName?: string;
      tagLine?: string;
      platformRoute?: PlatformRoute;
    };

    if (!gameName || !tagLine || !platformRoute) {
      return NextResponse.json(
        { error: 'Debes proporcionar tu nombre de invocador, lema (#TAG) y región.' },
        { status: 400 },
      );
    }

    if (!PLATFORM_TO_REGIONAL[platformRoute]) {
      return NextResponse.json({ error: 'La región seleccionada no es válida.' }, { status: 400 });
    }

    const cleanTag = tagLine.replace(/^#/, '').trim();
    const cleanName = gameName.trim();

    // 1. Obtener la cuenta de Riot mediante Account-V1
    const riotAccount = await getAccountByRiotId(cleanName, cleanTag, platformRoute);

    // 2. Intentar obtener el summoner_id mediante Summoner-V4 (opcional si falla)
    let summonerId: string | null = null;
    try {
      const summoner = await getSummonerByPuuid(riotAccount.puuid, platformRoute);
      summonerId = summoner.id;
    } catch {
      // Si Summoner-V4 falla temporalmente, continuamos con el PUUID que es el identificador principal
    }

    const regionalRoute = PLATFORM_TO_REGIONAL[platformRoute];

    // 3. Desmarcar cuentas anteriores como principales si existen para este perfil
    await supabase
      .from('riot_accounts')
      .update({ is_primary: false })
      .eq('profile_id', userData.user.id);

    // 4. Insertar o actualizar la cuenta en public.riot_accounts
    const { data: savedAccount, error: accountError } = await supabase
      .from('riot_accounts')
      .upsert(
        {
          profile_id: userData.user.id,
          puuid: riotAccount.puuid,
          summoner_id: summonerId,
          game_name: riotAccount.gameName,
          tag_line: riotAccount.tagLine,
          platform_route: platformRoute,
          regional_route: regionalRoute,
          is_primary: true,
          verified_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          sync_status: 'ready',
        },
        { onConflict: 'puuid' },
      )
      .select('id, profile_id, puuid, game_name, tag_line, platform_route, is_primary, verified_at, last_synced_at, sync_status')
      .single();

    if (accountError || !savedAccount) {
      return NextResponse.json(
        { error: 'No fue posible registrar la cuenta de Riot en tu perfil.' },
        { status: 500 },
      );
    }

    // 5. Obtener el rango inicial e insertar el snapshot competitivo
    try {
      const entries = await getLeagueEntriesByPuuid(riotAccount.puuid, platformRoute);
      const soloQueue = entries.find((e) => e.queueType === 'RANKED_SOLO_5x5') || entries[0];

      if (soloQueue) {
        await supabase.from('ranked_snapshots').insert({
          riot_account_id: savedAccount.id,
          queue_type: soloQueue.queueType,
          tier: soloQueue.tier,
          division: soloQueue.rank,
          league_points: soloQueue.leaguePoints,
          wins: soloQueue.wins,
          losses: soloQueue.losses,
        });
      }
    } catch {
      // Si la consulta de ligas falla, la cuenta sigue vinculada y se sincronizará en segundo plano
    }

    // 6. Encolar trabajo de sincronización inicial en private.sync_jobs
    try {
      await supabase.schema('private').from('sync_jobs').insert({
        riot_account_id: savedAccount.id,
        reason: 'initial_account_link',
        status: 'pending',
        attempts: 0,
      });
    } catch {
      // La cola interna se gestiona de forma tolerante a fallos
    }

    return NextResponse.json({
      success: true,
      account: {
        id: savedAccount.id,
        gameName: savedAccount.game_name,
        tagLine: savedAccount.tag_line,
        platformRoute: savedAccount.platform_route,
        verifiedAt: savedAccount.verified_at,
        syncStatus: savedAccount.sync_status,
      },
    });
  } catch (error) {
    if (error instanceof RiotApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al vincular la cuenta. Inténtalo de nuevo.' },
      { status: 500 },
    );
  }
}
