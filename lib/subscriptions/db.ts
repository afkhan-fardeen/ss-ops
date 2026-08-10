import { getSupabaseService } from "@/lib/supabase/service";
import type { PublicSubscriptionPayload, SubscriptionRequestRow, SubscriptionStatus } from "./types";

const BUCKET = "subscription-pdfs";

export async function uploadSubscriptionPdf(id: string, bytes: Uint8Array): Promise<string> {
  const supabase = getSupabaseService();
  if (!supabase) throw new Error("Database not configured");

  const path = `${id}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function downloadSubscriptionPdf(storagePath: string): Promise<ArrayBuffer | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  return data.arrayBuffer();
}

export async function insertSubscriptionRequest(
  id: string,
  referenceNumber: string,
  payload: PublicSubscriptionPayload,
  pdfPath: string,
): Promise<SubscriptionRequestRow> {
  const supabase = getSupabaseService();
  if (!supabase) throw new Error("Database not configured");

  const now = new Date().toISOString();
  const row = {
    id,
    reference_number: referenceNumber,
    status: "pending" as const,
    submitted_at: now,
    updated_at: now,
    employee_name: payload.employee_name,
    employee_email: payload.employee_email,
    department: payload.department ?? null,
    job_title: payload.job_title ?? null,
    subscription_name: payload.subscription_name,
    vendor: payload.vendor ?? null,
    amount: payload.amount,
    currency: payload.currency,
    billing_cycle: payload.billing_cycle,
    billing_cycle_other: payload.billing_cycle_other ?? null,
    entity_billed: payload.entity_billed ?? null,
    payment_method: payload.payment_method ?? null,
    start_date: payload.start_date ?? null,
    justification: payload.justification ?? null,
    notes: payload.notes ?? null,
    pdf_storage_path: pdfPath,
    pdf_generated_at: now,
  };

  const { data, error } = await supabase
    .from("subscription_requests")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Insert failed");
  return data as SubscriptionRequestRow;
}

export async function listSubscriptionRequests(
  status?: SubscriptionStatus | "all",
): Promise<SubscriptionRequestRow[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];

  let query = supabase
    .from("subscription_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as SubscriptionRequestRow[];
}

export async function getSubscriptionRequest(id: string): Promise<SubscriptionRequestRow | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as SubscriptionRequestRow;
}

export async function updateSubscriptionStatus(
  id: string,
  update: Partial<SubscriptionRequestRow>,
): Promise<SubscriptionRequestRow | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("subscription_requests")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  return data as SubscriptionRequestRow;
}

export async function countPendingSubscriptions(): Promise<number> {
  const supabase = getSupabaseService();
  if (!supabase) return 0;

  const { count } = await supabase
    .from("subscription_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return count ?? 0;
}

/** Permanently delete request row and stored PDF (if any). */
export async function deleteSubscriptionRequest(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseService();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const existing = await getSubscriptionRequest(id);
  if (!existing) return { ok: false, error: "Not found" };

  const paths = [existing.pdf_storage_path, `${id}.pdf`].filter(
    (p): p is string => Boolean(p),
  );
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length > 0) {
    await supabase.storage.from(BUCKET).remove(uniquePaths);
  }

  const { error } = await supabase.from("subscription_requests").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export { BUCKET as SUBSCRIPTION_PDF_BUCKET };
