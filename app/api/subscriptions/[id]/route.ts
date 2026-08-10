import { NextRequest, NextResponse } from "next/server";
import {
  deleteSubscriptionRequest,
  getSubscriptionRequest,
} from "@/lib/subscriptions/db";
import { requireSubscriptionAdmin } from "@/lib/subscriptions/require-admin";
import { getAdminActor } from "@/lib/subscriptions/admin-actor";

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

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const actor = await getAdminActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: actor.status });
  }

  const p = await Promise.resolve(ctx.params);
  const existing = await getSubscriptionRequest(p.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const result = await deleteSubscriptionRequest(p.id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: existing.reference_number });
}
