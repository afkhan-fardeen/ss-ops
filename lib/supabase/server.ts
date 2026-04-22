import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Server Supabase client that reads/writes the auth cookie. Returns `null` when Supabase env vars are not set.
 *
 * Phase B uses this only for optional table reads/writes (no auth yet). Phase C promotes it to the auth
 * provider.
 */
export function createSupabaseServerClient(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* Next.js forbids cookie writes in RSC reads; middleware/actions handle writes. */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* ignore */
        }
      },
    },
  });
}
