import {
  PLATFORM_TO_REGIONAL,
  type PlatformRoute,
  type RiotAccountDto,
  type RiotLeagueEntryDto,
  type RiotSummonerDto,
} from './types';

function getRiotApiKey(): string {
  const key = process.env.RIOT_API_KEY || (typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env?.RIOT_API_KEY : '');
  if (!key) {
    throw new Error('Falta la configuración de RIOT_API_KEY en el servidor.');
  }
  return key;
}

export class RiotApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'SERVICE_ERROR' | 'UNKNOWN' = 'UNKNOWN',
  ) {
    super(message);
    this.name = 'RiotApiError';
  }
}

async function fetchRiot<T>(url: string): Promise<T> {
  const apiKey = getRiotApiKey();

  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': apiKey,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (response.ok) {
    return response.json() as Promise<T>;
  }

  if (response.status === 404) {
    throw new RiotApiError('No encontramos una cuenta de Riot con ese nombre y lema.', 404, 'NOT_FOUND');
  }

  if (response.status === 401 || response.status === 403) {
    throw new RiotApiError('La clave de Riot Games no es válida o expiró.', response.status, 'UNAUTHORIZED');
  }

  if (response.status === 429) {
    throw new RiotApiError('Límite de solicitudes a Riot alcanzado. Intenta de nuevo en unos momentos.', 429, 'RATE_LIMITED');
  }

  throw new RiotApiError('El servicio de Riot Games no está disponible temporalmente.', response.status, 'SERVICE_ERROR');
}

/**
 * Resuelve el Riot ID (gameName + tagLine) a un PUUID mediante Account-V1.
 */
export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  platform: PlatformRoute,
): Promise<RiotAccountDto> {
  const regional = PLATFORM_TO_REGIONAL[platform] || 'americas';
  const encodedName = encodeURIComponent(gameName.trim());
  const encodedTag = encodeURIComponent(tagLine.trim().replace(/^#/, ''));
  const url = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedName}/${encodedTag}`;

  return fetchRiot<RiotAccountDto>(url);
}

/**
 * Obtiene los datos del invocador mediante Summoner-V4 usando el PUUID.
 */
export async function getSummonerByPuuid(
  puuid: string,
  platform: PlatformRoute,
): Promise<RiotSummonerDto> {
  const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  return fetchRiot<RiotSummonerDto>(url);
}

/**
 * Obtiene las entradas de clasificatoria (Solo/Duo y Flex) mediante League-V4 usando el PUUID.
 */
export async function getLeagueEntriesByPuuid(
  puuid: string,
  platform: PlatformRoute,
): Promise<RiotLeagueEntryDto[]> {
  const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
  return fetchRiot<RiotLeagueEntryDto[]>(url);
}
