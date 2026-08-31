import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const DEFAULT_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYXdhbHNuaWNrdWdjdGpmeW5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg2OTE4MCwiZXhwIjoyMTAzNDQ1MTgwfQ.Iu7j0BwX_En3w_xHlcMzHkBL_jfTT2vZUAkt6XJ2PGQ';

export function getSupabaseAdminClient() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://grawalsnickugctjfynm.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY;

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
