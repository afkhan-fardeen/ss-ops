import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Guard for cron/maintenance endpoints under /api/sync (public in middleware, so they authenticate here).
 * Fails closed: if CRON_SECRET is not configured the endpoint refuses to run instead of being open.
 * Returns a NextResponse to send back when the request is rejected, or null when it may proceed.
 */
export function verifyCronRequest(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const received = Buffer.from(req.headers.get("authorization") ?? "", "utf8");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
