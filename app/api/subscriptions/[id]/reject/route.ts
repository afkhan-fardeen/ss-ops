import { NextRequest, NextResponse } from "next/server";
import {
  getSubscriptionRequest,
  updateSubscriptionStatus,
  uploadSubscriptionPdf,
} from "@/lib/subscriptions/db";
import { regenerateSubscriptionPdf } from "@/lib/subscriptions/fill-pdf";
import { getAdminActor } from "@/lib/subscriptions/admin-actor";

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const actor = await getAdminActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: actor.status });
  }

  const p = await Promise.resolve(ctx.params);
  const existing = await getSubscriptionRequest(p.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Request is not pending" }, { status: 400 });
  }

  let reason: string | undefined;
  try {
    const body = (await req.json()) as { reason?: string };
    reason = typeof body.reason === "string" ? body.reason.trim() : undefined;
  } catch {
    /* optional */
  }

  const now = new Date().toISOString();
  const updated = await updateSubscriptionStatus(p.id, {
    status: "rejected",
    rejected_by: actor.userId,
    rejected_by_name: actor.displayName,
    rejected_at: now,
    rejection_reason: reason ?? null,
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }

  try {
    const pdfBytes = await regenerateSubscriptionPdf(updated);
    await uploadSubscriptionPdf(p.id, pdfBytes);
    await updateSubscriptionStatus(p.id, { pdf_generated_at: now });
  } catch (e) {
    console.error("[subscriptions/reject] PDF regen failed", e);
  }

  return NextResponse.json({ ok: true });
}
