import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseService } from "@/lib/supabase/service";

export type CodEmailLogRow = {
  id: string;
  sent_at: string;
  sent_by_email: string | null;
  window_start: string;
  window_end: string;
  recipients: string;
  order_count: number;
  status: "success" | "error";
  error: string | null;
};

/** GET /api/cod-email-log — last 100 email sends */
export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  if (!supabase) return NextResponse.json({ rows: [] });

  try {
    const { data, error } = await supabase
      .from("cod_email_log")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { rows: [], error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
