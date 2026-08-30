import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | undefined;

function getConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL) ||
    'https://grawalsnickugctjfynm.supabase.co';

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    'sb_publishable_oiInS-XLmqXBakJ3toJpPA_FjWKPecn';

  return { url, key };
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
