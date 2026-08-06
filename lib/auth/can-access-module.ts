import type { ModuleId } from "@/config/modules";
import { requireSession, type PortalSession } from "./require-session";
import { isPortalAdmin } from "./is-portal-admin";
import { PortalAuthError } from "./require-portal-admin";
import { getUserAllowedModules } from "@/lib/supabase/profiles";

/**
 * Whether the current user may use a given module.
 * - Admins: always true
 * - Members with allowed_modules = null: all modules (full access)
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
    // Shared-password sessions: treat as unrestricted for non-admin modules historically.
    // Stock still requires an explicit grant or admin — shared sessions do not get stock.
    return moduleId !== "stock";
  }

  const allowed = await getUserAllowedModules(session.userId);
  if (allowed === null) return true;
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
