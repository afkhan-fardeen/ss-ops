import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase magic-link callback. Exchanges the `?code=…` for a session cookie, then redirects
 * back to the `next` param (defaults to /cod-list).
 */
export async function GET(req: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.redirect(new URL("/login?error=supabase_not_configured", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/cod-list";

  const res = NextResponse.redirect(new URL(next, req.url));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url),
    );
  }

  return res;
}
