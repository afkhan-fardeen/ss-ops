import { getSupabaseService } from "./service";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  allowed_modules: string[] | null;
  created_at: string;
};

/**
 * Return the allowed_modules list for a user.
 * Returns null = unrestricted (all modules visible).
 */
export async function getUserAllowedModules(userId: string): Promise<string[] | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("allowed_modules")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[profiles] getUserAllowedModules failed:", error.message);
    return null;
  }

  return (data as { allowed_modules: string[] | null } | null)?.allowed_modules ?? null;
}

/** Return all profile rows. Used by the admin user-access panel. */
export async function getAllProfiles(): Promise<ProfileRow[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, allowed_modules, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[profiles] getAllProfiles failed:", error.message);
    return [];
  }

  return (data ?? []) as ProfileRow[];
}

/**
 * Set the allowed modules for a user.
 * Pass null to restore unrestricted access.
 */
export async function setUserAllowedModules(
  userId: string,
  modules: string[] | null,
): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;

  const { error } = await supabase
    .from("profiles")
    .update({ allowed_modules: modules })
    .eq("id", userId);

  if (error) {
    throw new Error(`[profiles] setUserAllowedModules failed: ${error.message}`);
  }
}
