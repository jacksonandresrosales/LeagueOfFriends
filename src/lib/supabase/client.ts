import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

function getConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function isSupabaseConfigured() {
  const { url, key } = getConfig();
  return Boolean(url && key);
}

export function getSupabaseClient() {
  if (client) return client;

  const { url, key } = getConfig();
  if (!url || !key) {
    throw new Error('Falta la configuración pública de Supabase.');
  }

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}
