import { canAccessModule } from "@/lib/auth/can-access-module";
import { requireSession } from "@/lib/auth/require-session";

/**
 * Require subscriptions module access (portal admin or explicit module grant).
 * Full module rights: list, approve, reject, delete, PDF.
 */
export async function requireSubscriptionAccess(): Promise<
  { ok: true } | { ok: false; status: 401 | 403 }
> {
  try {
    await requireSession();
  } catch {
    return { ok: false, status: 401 };
  }

  if (!(await canAccessModule("subscriptions"))) {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}
