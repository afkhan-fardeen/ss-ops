import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateReferenceNumber } from "@/lib/subscriptions/reference-number";
import { fillSubscriptionPdf } from "@/lib/subscriptions/fill-pdf";
import { insertSubscriptionRequest, uploadSubscriptionPdf } from "@/lib/subscriptions/db";
import { parsePublicSubscriptionPayload } from "@/lib/subscriptions/validate";
import {
  checkPublicSubmitRateLimit,
  isSubscriptionsPublicEnabled,
} from "@/lib/subscriptions/rate-limit";
import type { SubscriptionRequestRow } from "@/lib/subscriptions/types";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  if (!isSubscriptionsPublicEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Subscription requests are temporarily unavailable" },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const rate = checkPublicSubmitRateLimit(ip);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions — please try again later" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parsePublicSubscriptionPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    const id = randomUUID();
    const referenceNumber = await generateReferenceNumber();
    const now = new Date().toISOString();

    const draftRow: SubscriptionRequestRow = {
      id,
      reference_number: referenceNumber,
      status: "pending",
      created_at: now,
      updated_at: now,
      submitted_at: now,
      subscription_type: parsed.data.subscription_type,
      employee_name: parsed.data.employee_name,
      employee_email: parsed.data.employee_email,
      department: parsed.data.department ?? null,
      job_title: parsed.data.job_title ?? null,
      subscription_name: parsed.data.subscription_name,
      vendor: parsed.data.vendor ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      billing_cycle: parsed.data.billing_cycle,
      billing_cycle_other: parsed.data.billing_cycle_other ?? null,
      entity_billed: parsed.data.entity_billed ?? null,
      payment_method: parsed.data.payment_method ?? null,
      start_date: parsed.data.start_date ?? null,
      justification: parsed.data.justification ?? null,
      notes: parsed.data.notes ?? null,
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      rejected_by: null,
      rejected_by_name: null,
      rejected_at: null,
      rejection_reason: null,
      pdf_storage_path: null,
      pdf_generated_at: null,
    };

    const pdfBytes = await fillSubscriptionPdf(draftRow);
    const pdfPath = await uploadSubscriptionPdf(id, pdfBytes);
    const row = await insertSubscriptionRequest(id, referenceNumber, parsed.data, pdfPath);

    return NextResponse.json({ ok: true, referenceNumber: row.reference_number, id: row.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save request";
    console.error("[subscriptions/request]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
