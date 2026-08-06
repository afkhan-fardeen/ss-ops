import { getSupabaseService } from "./service";

export type PortalLoginRow = {
  id: number;
  user_id: string | null;
  email: string | null;
  logged_in_at: string;
  user_agent: string | null;
  ip: string | null;
};

export async function recordPortalLogin(input: {
  userId: string;
  email: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;

  const { error } = await supabase.from("portal_login_log").insert({
    user_id: input.userId,
    email: input.email,
    ip: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    console.warn("[portal-login-log] insert failed:", error.message);
  }
}

export async function getRecentPortalLogins(limit = 50): Promise<PortalLoginRow[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("portal_login_log")
    .select("id, user_id, email, logged_in_at, user_agent, ip")
    .order("logged_in_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[portal-login-log] list failed:", error.message);
    return [];
  }

  return (data ?? []) as PortalLoginRow[];
}

/** Map of user id → last_sign_in_at from Supabase Auth (admin API). */
export async function getAuthLastSignInMap(
  userIds: string[],
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const supabase = getSupabaseService();
  if (!supabase || userIds.length === 0) return out;

  // listUsers is paginated; for a small staff portal, fetch first few pages and filter.
  const wanted = new Set(userIds);
  let page = 1;
  const perPage = 100;

  while (wanted.size > 0 && page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn("[portal-login-log] listUsers failed:", error.message);
      break;
    }
    const users = data?.users ?? [];
    if (users.length === 0) break;

    for (const u of users) {
      if (wanted.has(u.id)) {
        out.set(u.id, u.last_sign_in_at ?? null);
        wanted.delete(u.id);
      }
    }
    if (users.length < perPage) break;
    page += 1;
  }

  for (const id of userIds) {
    if (!out.has(id)) out.set(id, null);
  }

  return out;
}
