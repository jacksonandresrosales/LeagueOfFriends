import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | undefined;

function getConfig() {
  const metaEnv = typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env;
  const procEnv = typeof process !== 'undefined' ? process.env : {};
  return {
    url: metaEnv?.VITE_SUPABASE_URL || metaEnv?.NEXT_PUBLIC_SUPABASE_URL || procEnv.NEXT_PUBLIC_SUPABASE_URL || procEnv.VITE_SUPABASE_URL,
    key: metaEnv?.VITE_SUPABASE_PUBLISHABLE_KEY || metaEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY || procEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function isSupabaseConfigured() {
  const { url, key } = getConfig();
  return Boolean(url && key);
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  const { url, key } = getConfig();
  if (!url || !key) {
    throw new Error('Falta la configuración pública de Supabase.');
  }

  client = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}
