'use client';

import { ChartLineUp, GearSix, House, Plus, SignOut, Sword, Trophy, UsersThree } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

type NavigationItem = 'Resumen' | 'Comparar' | 'Amigos' | 'Retos' | 'Clasificación' | 'Ajustes';

const navItems = [
  { label: 'Resumen' as const, icon: House, href: '/' },
  { label: 'Comparar' as const, icon: ChartLineUp, href: '/comparar' },
  { label: 'Amigos' as const, icon: UsersThree, href: '/amigos' },
  { label: 'Retos' as const, icon: Sword, href: '/retos' },
  { label: 'Clasificación' as const, icon: Trophy, href: '/clasificacion' },
  { label: 'Ajustes' as const, icon: GearSix, href: '/vincular-riot' },
];

export function AppSidebar({ active }: { active: NavigationItem }) {
  const router = useRouter();

  async function handleSignOut() {
    await getSupabaseClient().auth.signOut({ scope: 'local' });
    router.replace('/login');
  }

  return (
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="LeagueOfFriends, inicio">
        <span className="brand-mark">LF</span>
        <span className="brand-name">LEAGUE<br />OF FRIENDS</span>
      </Link>
      <nav className="main-nav" aria-label="Navegación principal">
        {navItems.map(({ label, icon: Icon, href }) => (
          <Link key={label} href={href} className={active === label ? 'nav-link is-active' : 'nav-link'}>
            <Icon size={21} weight={active === label ? 'fill' : 'bold'} /><span>{label}</span>
          </Link>
        ))}
      </nav>
      <Link className="create-button" href="/retos/nuevo"><Plus size={20} weight="bold" /><span>Crear reto</span></Link>
      <div className="sidebar-footer">
        <button className="nav-link sign-out" type="button" onClick={handleSignOut}><SignOut size={21} weight="bold" /><span>Cerrar sesión</span></button>
      </div>
    </aside>
  );
}
