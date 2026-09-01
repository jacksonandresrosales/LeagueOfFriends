import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Acceso | LeagueOfFriends',
  description: 'Inicia sesión o crea tu cuenta de LeagueOfFriends.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-loading">Cargando acceso...</div>}>
      <AuthForm />
    </Suspense>
  );
}
