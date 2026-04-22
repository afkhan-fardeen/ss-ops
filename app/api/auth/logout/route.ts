import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-node";
import { getAuthMode } from "@/lib/auth/mode";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });

  if (getAuthMode() === "supabase") {
    const supabase = createSupabaseMiddlewareClient(req, res);
    if (supabase) await supabase.auth.signOut();
  }

  // Always clear the legacy cookie in case someone toggled modes.
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
