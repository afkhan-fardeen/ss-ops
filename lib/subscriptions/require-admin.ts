import { isPortalAdmin } from "@/lib/auth/is-portal-admin";

export async function requireSubscriptionAdmin(): Promise<
  { ok: true } | { ok: false; status: 401 | 403 }
> {
  try {
    if (await isPortalAdmin()) return { ok: true };
    return { ok: false, status: 403 };
  } catch {
    return { ok: false, status: 401 };
  }
}
