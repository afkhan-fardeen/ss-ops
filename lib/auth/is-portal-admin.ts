import { requireSession, type PortalSession } from "./require-session";
import { getSupabaseService } from "@/lib/supabase/service";

/**
 * True when the current session is a Supabase user with profiles.role = 'admin'.
 * Shared password sessions are never admin.
 */
export async function isPortalAdmin(): Promise<boolean> {
  let session: PortalSession;
  try {
    session = await requireSession();
  } catch {
    return false;
  }
  if (session.mode !== "supabase" || !session.userId) return false;
  const service = getSupabaseService();
  if (!service) return false;
  const { data } = await service
    .from("profiles")
    .select("role")
    .eq("id", session.userId)
    .maybeSingle();
  return (data as { role: string } | null)?.role === "admin";
}
