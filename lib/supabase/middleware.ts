import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Build a Supabase client bound to the edge middleware request/response cookie mutators.
 * Returns `null` (the caller should fall through to legacy auth) when env isn't configured.
 */
export function createSupabaseMiddlewareClient(req: NextRequest, res: NextResponse) {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options });
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: "", ...options });
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });
}
