import { NextRequest, NextResponse } from "next/server";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { setUserAllowedModules } from "@/lib/supabase/profiles";

/**
 * PATCH /api/admin/users/[id]
 * Body: { allowed_modules: string[] | null }
 *
 * Admin-only. Sets which module cards are visible for a user on the launcher.
 * null = unrestricted (all modules).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isPortalAdmin())) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing user id" }, { status: 400 });
  }

  let body: { allowed_modules?: string[] | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!("allowed_modules" in body)) {
    return NextResponse.json(
      { ok: false, error: "allowed_modules field is required" },
      { status: 400 },
    );
  }

  const modules = body.allowed_modules;

  // Validate: must be null or an array of non-empty strings.
  if (
    modules !== null &&
    (!Array.isArray(modules) || modules.some((m) => typeof m !== "string" || !m))
  ) {
    return NextResponse.json(
      { ok: false, error: "allowed_modules must be null or an array of module id strings" },
      { status: 400 },
    );
  }

  try {
    await setUserAllowedModules(id, modules ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
