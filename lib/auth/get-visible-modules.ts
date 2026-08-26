import { getPortalModules, type ModuleId, type PortalModule } from "@/config/modules";
import type { PortalSession } from "@/lib/auth/require-session";
import { getUserAllowedModules } from "@/lib/supabase/profiles";

/**
 * Modules the current user may see on the launcher and shell sidebar.
 * - Admin: all modules
 * - Shared-password session: COD / Fulfillment / AWB (no stock / analysis / ubex / subscriptions)
 * - Member with allowed_modules = null: COD / Fulfillment / AWB
 *   (stock, stock analysis, ubex inventory & subscriptions need an explicit grant)
 * - Member with an array: only those ids
 */
export async function getVisiblePortalModules(
  session: PortalSession,
  isAdmin: boolean,
): Promise<PortalModule[]> {
  const allModules = getPortalModules(true);

  if (isAdmin) return allModules;

  if (session.mode !== "supabase" || !session.userId) {
    return getPortalModules(false);
  }

  const allowed = await getUserAllowedModules(session.userId);
  if (allowed === null) {
    return allModules.filter(
      (m) =>
        m.id !== "stock" &&
        m.id !== "stockAnalysis" &&
        m.id !== "ubexInventory" &&
        m.id !== "subscriptions" &&
        m.id !== "zohoBooks",
    );
  }
  return allModules.filter((m) => allowed.includes(m.id));
}

/** Concrete module id list for client components (never null). */
export function moduleIdsFromVisible(modules: PortalModule[]): ModuleId[] {
  return modules.map((m) => m.id);
}
