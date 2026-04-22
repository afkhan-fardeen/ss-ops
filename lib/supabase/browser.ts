"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Singleton Supabase client for browser components. Throws if the public env is missing —
 * we only ever mount this component when `authMode === "supabase"`.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase public env vars are missing (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)");
  }
  cached = createBrowserClient(url, anonKey);
  return cached;
}
