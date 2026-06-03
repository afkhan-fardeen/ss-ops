import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionTokenEdge } from "@/lib/auth/session-edge";
import { getAuthMode } from "@/lib/auth/mode";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/callback",
  "/api/webhooks",
  "/api/sync",   // cron endpoints — auth handled inside the route via CRON_SECRET
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const mode = getAuthMode();

  let authenticated = false;

  if (mode === "supabase") {
    const supabase = createSupabaseMiddlewareClient(req, res);
    if (!supabase) {
      // Supabase was requested but isn't configured — fail closed.
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
      }
      return new NextResponse("Server misconfigured: set NEXT_PUBLIC_SUPABASE_URL/ANON_KEY", {
        status: 500,
      });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authenticated = Boolean(user);
  } else {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 16) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
      }
      return new NextResponse("Server misconfigured: set SESSION_SECRET (16+ chars)", {
        status: 500,
      });
    }
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    authenticated = token ? await verifySessionTokenEdge(token, secret) : false;
  }

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
