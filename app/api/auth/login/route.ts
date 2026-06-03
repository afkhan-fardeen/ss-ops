import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-node";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function fixedUtf8Buffer(s: string): Buffer {
  const buf = Buffer.alloc(4096);
  const src = Buffer.from(s, "utf8");
  src.copy(buf, 0, 0, Math.min(src.length, buf.length));
  return buf;
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const row = attempts.get(ip);
  if (!row || now > row.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (row.count >= MAX_ATTEMPTS) return false;
  row.count += 1;
  return true;
}

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  const expected = process.env.PORTAL_PASSWORD;
  if (!secret || secret.length < 16) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (!expected) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const ip = clientIp(req);
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  let body: { password?: string; next?: string };
  try {
    body = (await req.json()) as { password?: string; next?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = body.password ?? "";
  const a = fixedUtf8Buffer(password);
  const b = fixedUtf8Buffer(expected);
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createSessionToken(secret);
  const res = NextResponse.json({ ok: true, next: body.next ?? "/dashboard" });
  const opts = sessionCookieOptions(7 * 24 * 60 * 60);
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return res;
}
