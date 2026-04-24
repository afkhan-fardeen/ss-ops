import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseService } from "@/lib/supabase/service";
import { ensureCodSettings } from "@/lib/supabase/ensure-cod-settings";

const TABLE = "cod_settings";
const KEY = "email_recipients";

export async function GET(_req: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  if (!supabase) return NextResponse.json({ recipients: [] });

  await ensureCodSettings();

  try {
    const { data } = await supabase
      .from(TABLE)
      .select("value")
      .eq("key", KEY)
      .maybeSingle();

    const raw = (data as { value: string } | null)?.value ?? "";
    const recipients = raw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    return NextResponse.json({ recipients });
  } catch {
    return NextResponse.json({ recipients: [] });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  await ensureCodSettings();

  try {
    const body = (await req.json()) as { recipients: string[] };
    const value = (body.recipients ?? [])
      .map((e) => e.trim())
      .filter((e) => e.includes("@"))
      .join(",");

    const { error } = await supabase
      .from(TABLE)
      .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
