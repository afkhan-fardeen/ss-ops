import { NextResponse, type NextRequest } from "next/server";
import { PortalAuthError, requirePortalAdmin } from "@/lib/auth/require-portal-admin";

/**
 * POST /api/sync/trigger?dry_run=true|false
 *
 * Admin-only endpoint that lets portal admins manually trigger the
 * auto-fulfill sync from the UI. Internally proxies to /api/sync/auto-fulfill
 * using the CRON_SECRET so the main route stays cron-only.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePortalAdmin();
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry_run") !== "false";
  const cronSecret = process.env.CRON_SECRET?.trim();

  const origin = req.nextUrl.origin;
  const url = `${origin}/api/sync/auto-fulfill?dry_run=${dryRun}`;

  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cronSecret}`,
  };

  try {
    const res = await fetch(url, { method: "POST", headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Trigger failed" },
      { status: 500 },
    );
  }
}
