import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

let cached: SupabaseClient | null | undefined;

/**
 * Service-role Supabase client for server-only writes (webhook handlers, fulfillment log inserts).
 * Returns `null` when service key is not configured.
 *
 * NEVER expose this to the browser.
 *
 * NOTE: untyped. See `lib/supabase/types.ts` for row/insert shapes used by callers.
 */
export function getSupabaseService(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const env = getSupabaseEnv();
  if (!env || !env.serviceKey) {
    cached = null;
    return null;
  }
  cached = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Test hook: reset the cached client (useful when env changes in dev). */
export function resetSupabaseServiceCache(): void {
  cached = undefined;
}
