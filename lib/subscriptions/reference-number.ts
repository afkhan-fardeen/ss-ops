import { getSupabaseService } from "@/lib/supabase/service";

/** Generates SUB-YYYY-NNNNN from existing rows. */
export async function generateReferenceNumber(): Promise<string> {
  const supabase = getSupabaseService();
  if (!supabase) throw new Error("Database not configured");

  const year = new Date().getFullYear();
  const prefix = `SUB-${year}-`;

  const { data } = await supabase
    .from("subscription_requests")
    .select("reference_number")
    .like("reference_number", `${prefix}%`)
    .order("reference_number", { ascending: false })
    .limit(1);

  let next = 1;
  if (data?.[0]?.reference_number) {
    const tail = data[0].reference_number.slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (!Number.isNaN(parsed)) next = parsed + 1;
  }

  return `${prefix}${String(next).padStart(5, "0")}`;
}
