import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LeaderboardView } from '@/components/leaderboard/leaderboard-view';

export const metadata: Metadata = {
  title: 'Clasificación | LeagueOfFriends',
  description: 'Tabla de clasificación y ranking de invocadores de League of Legends.',
};

export default function ClasificacionPage() {
  return (
    <Suspense fallback={<div className="auth-loading">Cargando clasificación...</div>}>
      <LeaderboardView />
    </Suspense>
  );
}
