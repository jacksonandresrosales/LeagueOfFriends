import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function getSupabaseAdminClient() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://grawalsnickugctjfynm.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en las variables del servidor.');
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
