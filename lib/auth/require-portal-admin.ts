import { requireSession, type PortalSession } from "./require-session";
import { getSupabaseService } from "@/lib/supabase/service";

export type PortalAdminSession = PortalSession & { userId: string; email?: string };

export class PortalAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "PortalAuthError";
  }
}

/** Throws PortalAuthError(401|403). Returns session when user is a portal admin. */
export async function requirePortalAdmin(): Promise<PortalAdminSession> {
  let session: PortalSession;
  try {
    session = await requireSession();
  } catch {
    throw new PortalAuthError("Unauthorized", 401);
  }

  if (session.mode !== "supabase" || !session.userId) {
    throw new PortalAuthError("Admin access required", 403);
  }

  const service = getSupabaseService();
  if (!service) {
    throw new PortalAuthError("Admin access required", 403);
  }

  const { data } = await service
    .from("profiles")
    .select("role")
    .eq("id", session.userId)
    .maybeSingle();

  if ((data as { role: string } | null)?.role !== "admin") {
    throw new PortalAuthError("Admin access required", 403);
  }

  return { ...session, userId: session.userId };
}
