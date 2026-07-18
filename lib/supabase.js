import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (uses service role key for full access)
export function createServerClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
