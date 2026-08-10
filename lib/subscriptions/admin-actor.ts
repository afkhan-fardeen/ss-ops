import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseService } from "@/lib/supabase/service";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";

export async function getAdminActor(): Promise<
  { ok: true; userId: string; displayName: string } | { ok: false; status: 401 | 403 }
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, status: 401 };
  }

  if (!(await isPortalAdmin()) || session.mode !== "supabase" || !session.userId) {
    return { ok: false, status: 403 };
  }

  const supabase = getSupabaseService();
  let displayName = session.email ?? "Admin";
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.userId)
      .maybeSingle();
    const p = data as { full_name?: string; email?: string } | null;
    displayName = p?.full_name ?? p?.email ?? displayName;
  }

  return { ok: true, userId: session.userId, displayName };
}
