import { NextResponse } from "next/server";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { PortalAuthError, requirePortalAdmin } from "@/lib/auth/require-portal-admin";
import { getSupabaseService } from "@/lib/supabase/service";

const ALLOWED_KEYS = [
  "fulfillment_notify_emails", // notify when cron fulfills orders
  "error_notify_emails",       // notify on cron errors
  "sales_report_emails",       // daily sales report (both stores)
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

function isAllowedKey(k: unknown): k is AllowedKey {
  return ALLOWED_KEYS.includes(k as AllowedKey);
}

function parseList(raw: string): string[] {
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

/**
 * Sales-report recipients need the Sales Report module; the cron notification lists are admin-only.
 */
async function authorize(key: AllowedKey | null): Promise<NextResponse | null> {
  try {
    if (key === "sales_report_emails") await requireModuleAccess("salesReport");
    else await requirePortalAdmin();
    return null;
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * GET /api/settings/recipients?key=sales_report_emails
 * Returns { recipients: string[] } for one key.
 * GET /api/settings/recipients (admin) returns every key as { settings: Record<key, string[]> }.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const keyParam = url.searchParams.get("key");
  const singleKey = isAllowedKey(keyParam) ? keyParam : null;

  const denied = await authorize(singleKey);
  if (denied) return denied;

  const supabase = getSupabaseService();
  if (!supabase) return NextResponse.json({ settings: {}, recipients: [] });

  const { data, error } = await supabase
    .from("cod_settings")
    .select("key, value")
    .in("key", [...ALLOWED_KEYS]);

  if (error) {
    console.error("[settings/recipients GET] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map: Record<string, string[]> = {};
  for (const row of (data ?? []) as { key: string; value: string }[]) {
    map[row.key] = parseList(row.value);
  }

  if (singleKey) {
    return NextResponse.json({ recipients: map[singleKey] ?? [] });
  }

  return NextResponse.json({ settings: map });
}

/**
 * POST /api/settings/recipients
 * Body: { key: AllowedKey; recipients: string[] }
 */
export async function POST(req: Request) {
  let body: { key?: string; recipients?: unknown };
  try {
    body = (await req.json()) as { key?: string; recipients?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isAllowedKey(body.key)) {
    return NextResponse.json({ error: "Unknown settings key" }, { status: 400 });
  }
  const key = body.key;

  const denied = await authorize(key);
  if (denied) return denied;

  const supabase = getSupabaseService();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const list = Array.isArray(body.recipients) ? body.recipients : [];
    const value = list
      .filter((e): e is string => typeof e === "string")
      .map((e) => e.trim())
      .filter((e) => EMAIL_RE.test(e))
      .join(",");

    const { error } = await supabase
      .from("cod_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[settings/recipients] save failed:", e);
    return NextResponse.json({ error: "Failed to save recipients" }, { status: 500 });
  }
}
