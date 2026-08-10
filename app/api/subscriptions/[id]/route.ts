import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionRequest } from "@/lib/subscriptions/db";
import { requireSubscriptionAdmin } from "@/lib/subscriptions/require-admin";

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requireSubscriptionAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: auth.status });
  }

  const p = await Promise.resolve(ctx.params);
  const row = await getSubscriptionRequest(p.id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, row });
}
