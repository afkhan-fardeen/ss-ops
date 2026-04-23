import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getRecentCronRuns } from "@/lib/supabase/cron-run-log";

/**
 * GET /api/sync/status
 * Returns the last 10 cron run log rows. Used by the CronStatus UI component.
 */
export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runs = await getRecentCronRuns(10);
  return NextResponse.json({ ok: true, runs });
}
