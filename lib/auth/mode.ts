import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthMode = "supabase" | "shared";

/**
 * Resolves the current authentication provider.
 *
 *   AUTH_PROVIDER=supabase   → Supabase Auth (Phase C)
 *   AUTH_PROVIDER=shared     → shared password (legacy, pre-Phase C)
 *   AUTH_PROVIDER unset      → auto: Supabase if configured, otherwise shared
 *
 * This lets us flip deployments atomically and roll back if needed.
 */
export function getAuthMode(): AuthMode {
  const raw = (process.env.AUTH_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "supabase") return "supabase";
  if (raw === "shared") return "shared";
  return isSupabaseConfigured() ? "supabase" : "shared";
}

export function isSupabaseAuthMode(): boolean {
  return getAuthMode() === "supabase";
}
