import { isPortalAdmin } from "./is-portal-admin";
import { requireSession, type PortalSession } from "./require-session";

export class PortalAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "PortalAuthError";
  }
}

/** Throws PortalAuthError (401 unauthenticated, 403 not an admin). Returns the session. */
export async function requirePortalAdmin(): Promise<PortalSession> {
  let session: PortalSession;
  try {
    session = await requireSession();
  } catch {
    throw new PortalAuthError("Unauthorized", 401);
  }
  if (!(await isPortalAdmin())) {
    throw new PortalAuthError("Admin access required", 403);
  }
  return session;
}
