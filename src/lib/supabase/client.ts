import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | undefined;

function getConfig() {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : process.env;
  return {
    url: env.VITE_SUPABASE_URL,
    key: env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
