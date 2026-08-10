import { NextRequest, NextResponse } from "next/server";
import { listSubscriptionRequests } from "@/lib/subscriptions/db";
import { requireSubscriptionAccess } from "@/lib/subscriptions/require-admin";
import type { SubscriptionStatus } from "@/lib/subscriptions/types";

export async function GET(req: NextRequest) {
  const auth = await requireSubscriptionAccess();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: auth.status });
  }

  const statusParam = req.nextUrl.searchParams.get("status") ?? "pending";
  const status =
    statusParam === "all"
      ? "all"
      : (["pending", "approved", "rejected"].includes(statusParam)
          ? statusParam
          : "pending") as SubscriptionStatus | "all";

  const rows = await listSubscriptionRequests(status);
  return NextResponse.json({ ok: true, rows });
}
