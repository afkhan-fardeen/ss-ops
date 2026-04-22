import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
import { verifySessionToken } from "./session-node";
import { getAuthMode } from "./mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PortalSession = {
  mode: "supabase" | "shared";
  userId?: string;
  email?: string;
};

/**
 * Throws on unauthenticated requests. Returns the session shape so server actions can
 * attribute writes to the signed-in user (Phase C).
 */
export async function requireSession(): Promise<PortalSession> {
  const mode = getAuthMode();

  if (mode === "supabase") {
    const supabase = createSupabaseServerClient();
    if (!supabase) throw new Error("Supabase is not configured");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return { mode: "supabase", userId: user.id, email: user.email ?? undefined };
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token || !verifySessionToken(token, secret)) {
    throw new Error("Unauthorized");
  }
  return { mode: "shared" };
}
