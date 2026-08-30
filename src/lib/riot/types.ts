export type PlatformRoute =
  | 'la1'
  | 'la2'
  | 'na1'
  | 'br1'
  | 'euw1'
  | 'eun1'
  | 'kr'
  | 'jp1'
  | 'oc1';

export type RegionalRoute = 'americas' | 'europe' | 'asia' | 'sea';

export const PLATFORM_TO_REGIONAL: Record<PlatformRoute, RegionalRoute> = {
  la1: 'americas',
  la2: 'americas',
  na1: 'americas',
  br1: 'americas',
  euw1: 'europe',
  eun1: 'europe',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
};

export const PLATFORMS: Array<{ id: PlatformRoute; label: string; tag: string }> = [
  { id: 'la1', label: 'Latinoamérica Norte', tag: 'LAN' },
  { id: 'la2', label: 'Latinoamérica Sur', tag: 'LAS' },
  { id: 'na1', label: 'Norteamérica', tag: 'NA' },
  { id: 'euw1', label: 'Europa Oeste', tag: 'EUW' },
  { id: 'eun1', label: 'Europa Nórdica y Este', tag: 'EUNE' },
  { id: 'br1', label: 'Brasil', tag: 'BR' },
  { id: 'kr', label: 'Corea', tag: 'KR' },
  { id: 'jp1', label: 'Japón', tag: 'JP' },
  { id: 'oc1', label: 'Oceanía', tag: 'OCE' },
];

export interface RiotAccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotSummonerDto {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface RiotLeagueEntryDto {
  leagueId: string;
  summonerId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}
