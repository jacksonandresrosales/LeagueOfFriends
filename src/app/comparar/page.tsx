import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthGate } from '@/components/auth/auth-gate';
import { CompareView } from '@/components/compare/compare-view';

export const metadata: Metadata = {
  title: 'Comparar Invocadores — LeagueOfFriends',
  description: 'Compara tu rendimiento, puntos de liga y victorias cara a cara con tus amigos.',
};

export default function CompararPage() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="app-shell" style={{ padding: '32px' }}><p className="eyebrow">Cargando comparativa...</p></div>}>
        <CompareView />
      </Suspense>
    </AuthGate>
  );
}
