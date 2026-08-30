import { AuthGate } from '@/components/auth/auth-gate';
import { Dashboard } from '@/components/dashboard/dashboard';

export default function Home() {
  return <AuthGate><Dashboard /></AuthGate>;
}
