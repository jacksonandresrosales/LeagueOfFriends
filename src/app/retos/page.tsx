import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChallengesListView } from '@/components/challenges/challenges-list-view';

export const metadata: Metadata = {
  title: 'Retos | LeagueOfFriends',
  description: 'Duelos, carreras de LP y retos competitivos entre amigos de League of Legends.',
};

export default function RetosPage() {
  return (
    <Suspense fallback={<div className="auth-loading">Cargando retos...</div>}>
      <ChallengesListView />
    </Suspense>
  );
}
