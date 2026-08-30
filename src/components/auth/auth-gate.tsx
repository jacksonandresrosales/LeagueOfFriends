'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

function displayNameFromUser(user: User) {
  const candidate = user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9 _-]/g, '').trim() ?? '';
  return candidate.length >= 2 ? candidate.slice(0, 32) : 'Invocador';
}

async function ensureProfile(user: User) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (error || data) return;

  await supabase.from('profiles').insert({
    id: user.id,
    display_name: displayNameFromUser(user),
  });
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace('/login');
      return;
    }

    const supabase = getSupabaseClient();
    let active = true;

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        if (active) router.replace('/login');
        return;
      }

      await ensureProfile(data.user);
      if (active) setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      void ensureProfile(session.user);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return <main className="auth-loading" aria-live="polite">Comprobando tu sesión...</main>;
  }

  return <>{children}</>;
}
