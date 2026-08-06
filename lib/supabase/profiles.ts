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

export type CreatePortalUserInput = {
  email: string;
  password: string;
  fullName?: string;
  allowedModules: string[];
};

export type CreatePortalUserResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; error: string };

/**
 * Create a Supabase Auth user (member) and set profiles.allowed_modules.
 * Profile row is created by the handle_new_user trigger; we then patch modules + name.
 */
export async function createPortalUser(
  input: CreatePortalUserInput,
): Promise<CreatePortalUserResult> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return { ok: false, error: "Supabase service key is not configured" };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName?.trim() || undefined;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (error || !data.user) {
    const msg = error?.message ?? "Failed to create user";
    // Surface duplicate-email clearly for the admin UI.
    if (/already|registered|exists/i.test(msg)) {
      return { ok: false, error: "A user with this email already exists" };
    }
    return { ok: false, error: msg };
  }

  const userId = data.user.id;

  const patch: { allowed_modules: string[]; full_name?: string } = {
    allowed_modules: input.allowedModules,
  };
  if (fullName) patch.full_name = fullName;

  const { error: profileError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (profileError) {
    // Auth user exists; surface profile update failure so admin can fix modules manually.
    console.warn("[profiles] createPortalUser profile patch failed:", profileError.message);
    return {
      ok: false,
      error: `User created but profile update failed: ${profileError.message}`,
    };
  }

  return { ok: true, user: { id: userId, email } };
}
