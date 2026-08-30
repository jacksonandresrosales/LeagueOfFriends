const TIER_TRANSLATIONS: Record<string, string> = {
  IRON: 'Hierro',
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
  PLATINUM: 'Platino',
  EMERALD: 'Esmeralda',
  DIAMOND: 'Diamante',
  MASTER: 'Maestro',
  GRANDMASTER: 'Gran Maestro',
  CHALLENGER: 'Aspirante',
  UNRANKED: 'Sin clasificar',
};

export function formatTierName(tier?: string | null, division?: string | null): string {
  if (!tier || tier === 'UNRANKED') return 'Sin clasificar';
  const name = TIER_TRANSLATIONS[tier.toUpperCase()] || tier;
  return division ? `${name} ${division}` : name;
}

export function getRankInitials(division?: string | null): string {
  return division || 'IV';
}
