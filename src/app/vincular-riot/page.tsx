import type { Metadata } from 'next';
import { AuthGate } from '@/components/auth/auth-gate';
import { LinkRiotAccount } from '@/components/riot/link-riot-account';

export const metadata: Metadata = {
  title: 'Vincular Riot ID — LeagueOfFriends',
  description: 'Vincula tu cuenta de League of Legends con tu Riot ID.',
};

export default function LinkRiotPage() {
  return (
    <AuthGate>
      <LinkRiotAccount />
    </AuthGate>
  );
}
