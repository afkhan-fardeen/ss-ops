import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseService } from "@/lib/supabase/service";

const ALLOWED_KEYS = [
  "email_recipients",          // daily COD list email
  "fulfillment_notify_emails", // notify when cron fulfills orders
  "error_notify_emails",       // notify on cron errors
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

function isAllowedKey(k: unknown): k is AllowedKey {
  return ALLOWED_KEYS.includes(k as AllowedKey);
}

function parseList(raw: string): string[] {
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

/**
 * GET /api/cod-settings
 * Returns all settings keys as { settings: Record<key, string[]> }
 *
 * GET /api/cod-settings?key=email_recipients
 * Returns { recipients: string[] } for one key (backward compat).
 */
export async function GET(req: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  if (!supabase) return NextResponse.json({ settings: {}, recipients: [] });

  const url = new URL(req.url);
  const singleKey = url.searchParams.get("key");

  const { data, error } = await supabase
    .from("cod_settings")
    .select("key, value")
    .in("key", [...ALLOWED_KEYS]);

  if (error) {
    console.error("[cod-settings GET] Supabase error:", error.message);
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
 * POST /api/cod-settings
 * Body: { key: string; recipients: string[] }
 *
 * Also accepts legacy body { recipients: string[] } which defaults to "email_recipients".
 */
export async function POST(req: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const body = (await req.json()) as { key?: string; recipients: string[] };
    const key = isAllowedKey(body.key) ? body.key : "email_recipients";
    const value = (body.recipients ?? [])
      .map((e) => e.trim())
      .filter((e) => e.includes("@"))
      .join(",");

    const { error } = await supabase
      .from("cod_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
