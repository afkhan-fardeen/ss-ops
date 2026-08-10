import type { ModuleId } from "@/config/modules";
import { requireSession, type PortalSession } from "./require-session";
import { isPortalAdmin } from "./is-portal-admin";
import { PortalAuthError } from "./require-portal-admin";
import { getUserAllowedModules } from "@/lib/supabase/profiles";

/**
 * Whether the current user may use a given module.
 * - Admins: always true
 * - Members with allowed_modules = null: all modules except stock & subscriptions
 *   (those require an explicit grant or portal admin)
 * - Members with an array: only listed module ids
 */
export async function canAccessModule(moduleId: ModuleId): Promise<boolean> {
  if (await isPortalAdmin()) return true;

  let session: PortalSession;
  try {
    session = await requireSession();
  } catch {
    return false;
  }

  if (session.mode !== "supabase" || !session.userId) {
    // Shared-password sessions: COD / Fulfillment / AWB only.
    return moduleId !== "stock" && moduleId !== "subscriptions";
  }

  const allowed = await getUserAllowedModules(session.userId);
  if (allowed === null) {
    // Unrestricted members still need an explicit grant for stock & subscriptions.
    return moduleId !== "stock" && moduleId !== "subscriptions";
  }
  return allowed.includes(moduleId);
}

/** Throws PortalAuthError if the user cannot access the module. Returns session. */
export async function requireModuleAccess(moduleId: ModuleId): Promise<PortalSession> {
  let session: PortalSession;
  try {
    session = await requireSession();
  } catch {
    throw new PortalAuthError("Unauthorized", 401);
  }

  if (!(await canAccessModule(moduleId))) {
    throw new PortalAuthError("Module access required", 403);
  }

  return session;
}
