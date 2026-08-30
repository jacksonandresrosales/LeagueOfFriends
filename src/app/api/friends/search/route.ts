import { NextRequest, NextResponse } from 'next/server';
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

    const currentUserId = userData.user.id;
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // 1. Buscar en profiles y riot_accounts
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .neq('id', currentUserId)
      .ilike('display_name', `%${query}%`)
      .limit(10);

    const { data: riotAccounts } = await supabase
      .from('riot_accounts')
      .select('id, profile_id, game_name, tag_line, platform_route')
      .neq('profile_id', currentUserId)
      .ilike('game_name', `%${query}%`)
      .limit(10);

    // Combinar IDs únicos de perfiles
    const profileMap = new Map<string, {
      id: string;
      displayName: string;
      gameName?: string;
      tagLine?: string;
      platform?: string;
    }>();

    for (const p of profiles || []) {
      profileMap.set(p.id, {
        id: p.id,
        displayName: p.display_name,
      });
    }

    for (const r of riotAccounts || []) {
      const existing = profileMap.get(r.profile_id);
      if (existing) {
        existing.gameName = r.game_name;
        existing.tagLine = r.tag_line;
        existing.platform = r.platform_route.toUpperCase();
      } else {
        // Consultar el perfil si no vino en el primer query
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('id', r.profile_id)
          .single();

        profileMap.set(r.profile_id, {
          id: r.profile_id,
          displayName: prof?.display_name || r.game_name,
          gameName: r.game_name,
          tagLine: r.tag_line,
          platform: r.platform_route.toUpperCase(),
        });
      }
    }

    const candidateIds = Array.from(profileMap.keys());
    if (candidateIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 2. Consultar el estado de amistad con cada uno
    const { data: friendships } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

    const results = candidateIds.map((targetId) => {
      const info = profileMap.get(targetId)!;
      const relation = (friendships || []).find(
        (f) =>
          (f.requester_id === currentUserId && f.addressee_id === targetId) ||
          (f.addressee_id === currentUserId && f.requester_id === targetId),
      );

      let status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none';
      let friendshipId: number | undefined;

      if (relation) {
        friendshipId = relation.id;
        if (relation.status === 'accepted') {
          status = 'accepted';
        } else if (relation.requester_id === currentUserId) {
          status = 'pending_sent';
        } else {
          status = 'pending_received';
        }
      }

      return {
        id: info.id,
        displayName: info.displayName,
        gameName: info.gameName,
        tagLine: info.tagLine,
        platform: info.platform,
        status,
        friendshipId,
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Error al buscar invocadores.' }, { status: 500 });
  }
}
