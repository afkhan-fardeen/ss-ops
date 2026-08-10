import { NextRequest, NextResponse } from "next/server";
import {
  deleteSubscriptionRequest,
  getSubscriptionRequest,
  updateSubscriptionFields,
  updateSubscriptionStatus,
  uploadSubscriptionPdf,
} from "@/lib/subscriptions/db";
import { regenerateSubscriptionPdf } from "@/lib/subscriptions/fill-pdf";
import { requireSubscriptionAccess } from "@/lib/subscriptions/require-admin";
import { getAdminActor } from "@/lib/subscriptions/admin-actor";
import { ENTITY_OPTIONS, PAYMENT_METHOD_OPTIONS } from "@/lib/subscriptions/types";

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requireSubscriptionAccess();
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

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const actor = await getAdminActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: actor.status });
  }

  const p = await Promise.resolve(ctx.params);
  const existing = await getSubscriptionRequest(p.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  let body: {
    submitted_at?: string;
    entity_billed?: string | null;
    payment_method?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const patch: {
    submitted_at?: string;
    entity_billed?: string | null;
    payment_method?: string | null;
  } = {};

  if ("submitted_at" in body) {
    const raw = typeof body.submitted_at === "string" ? body.submitted_at.trim() : "";
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Date is required" }, { status: 400 });
    }
    const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
    }
    patch.submitted_at = d.toISOString();
  }

  if ("entity_billed" in body) {
    const entity =
      body.entity_billed === null || body.entity_billed === ""
        ? null
        : String(body.entity_billed).trim();
    if (entity && !ENTITY_OPTIONS.includes(entity as (typeof ENTITY_OPTIONS)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid entity" }, { status: 400 });
    }
    patch.entity_billed = entity;
  }

  if ("payment_method" in body) {
    const method =
      body.payment_method === null || body.payment_method === ""
        ? null
        : String(body.payment_method).trim();
    if (
      method &&
      !PAYMENT_METHOD_OPTIONS.includes(method as (typeof PAYMENT_METHOD_OPTIONS)[number])
    ) {
      return NextResponse.json({ ok: false, error: "Invalid payment method" }, { status: 400 });
    }
    patch.payment_method = method;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const updated = await updateSubscriptionFields(p.id, patch);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }

  try {
    const pdfBytes = await regenerateSubscriptionPdf(updated);
    const path = await uploadSubscriptionPdf(p.id, pdfBytes);
    await updateSubscriptionStatus(p.id, {
      pdf_generated_at: new Date().toISOString(),
      pdf_storage_path: path,
    });
  } catch (e) {
    console.error("[subscriptions/patch] PDF regen failed", e);
  }

  const refreshed = await getSubscriptionRequest(p.id);
  return NextResponse.json({ ok: true, row: refreshed ?? updated });
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
