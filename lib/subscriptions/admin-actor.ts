import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseService } from "@/lib/supabase/service";
import { canAccessModule } from "@/lib/auth/can-access-module";

/**
 * Actor for subscription approve/reject/delete — any user with subscriptions module access.
 */
export async function getAdminActor(): Promise<
  { ok: true; userId: string; displayName: string } | { ok: false; status: 401 | 403 }
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, status: 401 };
  }

  if (!(await canAccessModule("subscriptions"))) {
    return { ok: false, status: 403 };
  }

  if (session.mode !== "supabase" || !session.userId) {
    // Shared-password sessions cannot attribute approval to a user.
    return { ok: false, status: 403 };
  }

  const supabase = getSupabaseService();
  let displayName = session.email ?? "Staff";
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
