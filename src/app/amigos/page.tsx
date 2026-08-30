import type { Metadata } from 'next';
import { AuthGate } from '@/components/auth/auth-gate';
import { FriendsView } from '@/components/friends/friends-view';

export const metadata: Metadata = {
  title: 'Amigos — LeagueOfFriends',
  description: 'Gestiona tu círculo de amigos y envía solicitudes para competir.',
};

export default function AmigosPage() {
  return (
    <AuthGate>
      <FriendsView />
    </AuthGate>
  );
}
