import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the SERVICE ROLE key.
 * Use this ONLY in API routes that need write access (e.g., cron job).
 * The service role bypasses RLS.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Creates a Supabase client with the PUBLISHABLE key.
 * Use this in API routes that only need read access.
 * Respects RLS policies.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
