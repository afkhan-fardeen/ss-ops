import { NextRequest, NextResponse } from "next/server";
import {
  deleteSubscriptionRequest,
  getSubscriptionRequest,
  updateSubscriptionFields,
  updateSubscriptionStatus,
  uploadSubscriptionPdf,
  type SubscriptionEditableFields,
} from "@/lib/subscriptions/db";
import { regenerateSubscriptionPdf } from "@/lib/subscriptions/fill-pdf";
import { requireSubscriptionAccess } from "@/lib/subscriptions/require-admin";
import { getAdminActor } from "@/lib/subscriptions/admin-actor";
import {
  CURRENCY_OPTIONS,
  ENTITY_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  type BillingCycle,
} from "@/lib/subscriptions/types";

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

const BILLING_CYCLES: BillingCycle[] = ["monthly", "yearly", "one_time", "other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const patch: SubscriptionEditableFields = {};

  if ("submitted_at" in body) {
    const raw = str(body.submitted_at);
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Form signed date is required" }, { status: 400 });
    }
    const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
    }
    patch.submitted_at = d.toISOString();
  }

  if ("employee_name" in body) {
    const name = str(body.employee_name);
    if (!name) {
      return NextResponse.json({ ok: false, error: "Employee name is required" }, { status: 400 });
    }
    patch.employee_name = name;
  }

  if ("employee_email" in body) {
    const email = str(body.employee_email).toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    }
    patch.employee_email = email;
  }

  if ("department" in body) {
    patch.department = str(body.department) || null;
  }
  if ("job_title" in body) {
    patch.job_title = str(body.job_title) || null;
  }

  if ("subscription_name" in body) {
    const name = str(body.subscription_name);
    if (!name) {
      return NextResponse.json({ ok: false, error: "Subscription name is required" }, { status: 400 });
    }
    patch.subscription_name = name;
  }

  if ("vendor" in body) {
    patch.vendor = str(body.vendor) || null;
  }

  if ("amount" in body) {
    const amount =
      typeof body.amount === "number"
        ? body.amount
        : typeof body.amount === "string"
          ? parseFloat(body.amount)
          : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Valid amount is required" }, { status: 400 });
    }
    patch.amount = amount;
  }

  if ("currency" in body) {
    const currency = str(body.currency).toUpperCase();
    if (!CURRENCY_OPTIONS.includes(currency as (typeof CURRENCY_OPTIONS)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid currency" }, { status: 400 });
    }
    patch.currency = currency;
  }

  if ("billing_cycle" in body) {
    const cycle = str(body.billing_cycle) as BillingCycle;
    if (!BILLING_CYCLES.includes(cycle)) {
      return NextResponse.json({ ok: false, error: "Invalid billing cycle" }, { status: 400 });
    }
    patch.billing_cycle = cycle;
    if (cycle === "other") {
      const other = str(body.billing_cycle_other);
      if (!other) {
        return NextResponse.json(
          { ok: false, error: "Please specify other billing frequency" },
          { status: 400 },
        );
      }
      patch.billing_cycle_other = other;
    } else {
      patch.billing_cycle_other = null;
    }
  } else if ("billing_cycle_other" in body) {
    patch.billing_cycle_other = str(body.billing_cycle_other) || null;
  }

  if ("entity_billed" in body) {
    const entity = str(body.entity_billed) || null;
    if (entity && !ENTITY_OPTIONS.includes(entity as (typeof ENTITY_OPTIONS)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid entity" }, { status: 400 });
    }
    patch.entity_billed = entity;
  }

  if ("payment_method" in body) {
    const method = str(body.payment_method) || null;
    if (
      method &&
      !PAYMENT_METHOD_OPTIONS.includes(method as (typeof PAYMENT_METHOD_OPTIONS)[number])
    ) {
      return NextResponse.json({ ok: false, error: "Invalid payment method" }, { status: 400 });
    }
    patch.payment_method = method;
  }

  if ("justification" in body) {
    patch.justification = str(body.justification) || null;
  }
  if ("notes" in body) {
    patch.notes = str(body.notes) || null;
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
