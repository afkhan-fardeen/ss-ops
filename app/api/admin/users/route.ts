import { NextRequest, NextResponse } from "next/server";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { createPortalUser } from "@/lib/supabase/profiles";

const ALLOWED_MODULE_IDS = new Set(["cod", "fulfillment", "awb", "stock", "subscriptions"]);

/**
 * POST /api/admin/users
 * Body: { email, password, full_name?, allowed_modules: string[] }
 *
 * Admin-only. Creates a member account with email_confirm and sets module grants.
 */
export async function POST(req: NextRequest) {
  if (!(await isPortalAdmin())) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: {
    email?: string;
    password?: string;
    full_name?: string;
    allowed_modules?: string[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : undefined;
  const modules = body.allowed_modules;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }
  if (!Array.isArray(modules) || modules.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Select at least one module" },
      { status: 400 },
    );
  }
  if (modules.some((m) => typeof m !== "string" || !ALLOWED_MODULE_IDS.has(m))) {
    return NextResponse.json(
      { ok: false, error: "allowed_modules contains an invalid module id" },
      { status: 400 },
    );
  }

  const result = await createPortalUser({
    email,
    password,
    fullName,
    allowedModules: [...new Set(modules)],
  });

  if (!result.ok) {
    const status = /already exists/i.test(result.error) ? 409 : 500;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, user: result.user });
}
