import type { Metadata } from 'next';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';

export const metadata: Metadata = {
  title: 'Actualizar contraseña | LeagueOfFriends',
  description: 'Actualiza tu contraseña de LeagueOfFriends.',
};

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />;
}
