import { AuthGate } from '@/components/auth/auth-gate';
import type { Metadata } from 'next';
import { CreateChallenge } from '@/components/challenges/create-challenge';

export const metadata: Metadata = {
  title: 'Crear reto — LeagueOfFriends',
  description: 'Crea un reto competitivo e invita a tus amigos.',
};

export default function NewChallengePage() {
  return <AuthGate><CreateChallenge /></AuthGate>;
}
