import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase magic-link callback. Exchanges the `?code=…` for a session cookie, then redirects
 * back to the `next` param (defaults to /dashboard).
 */
export async function GET(req: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.redirect(new URL("/login?error=supabase_not_configured", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

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

  // Record magic-link login for admin activity (best-effort).
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { recordPortalLogin } = await import("@/lib/supabase/portal-login-log");
      const xf = req.headers.get("x-forwarded-for");
      const ip = xf ? xf.split(",")[0]?.trim() ?? null : req.headers.get("x-real-ip");
      await recordPortalLogin({
        userId: user.id,
        email: user.email ?? null,
        ip,
        userAgent: req.headers.get("user-agent"),
      });
    }
  } catch {
    /* ignore — login still succeeds */
  }

  return res;
}
