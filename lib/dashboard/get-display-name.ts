import type { PortalSession } from "@/lib/auth/require-session";
import { getSupabaseService } from "@/lib/supabase/service";

function titleCase(s: string): string {
  return s.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves the name shown on the launcher greeting. Supabase sessions try
 * `profiles.full_name` first, then fall back to the email's local part.
 * Shared-password sessions have no identity — the launcher shows a generic
 * "Welcome" in that case (return null).
 */
export async function getDisplayName(session: PortalSession): Promise<string | null> {
  if (session.mode !== "supabase") return null;

  if (session.userId) {
    const service = getSupabaseService();
    if (service) {
      const { data } = await service
        .from("profiles")
        .select("full_name")
        .eq("id", session.userId)
        .maybeSingle();
      const fullName = (data as { full_name: string | null } | null)?.full_name;
      if (fullName) return fullName.split(" ")[0];
    }
  }

  if (session.email) {
    return titleCase(session.email.split("@")[0]);
  }

  return null;
}

/** AST-local greeting, e.g. "Good afternoon". */
export function getAstGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bahrain", hour: "2-digit", hour12: false }).format(
      new Date(),
    ),
  );
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good evening";
}
