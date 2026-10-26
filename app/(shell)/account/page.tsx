import Link from "next/link";
import { AlertTriangle, KeyRound, Mail, Shield, ShieldCheck, User2 } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseService } from "@/lib/supabase/service";
import { SignOutButton } from "@/components/account/SignOutButton";
import { InstallAppCard } from "@/components/pwa/InstallAppCard";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  created_at: string;
  full_name: string | null;
};

export default async function AccountPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-danger/25 bg-danger-soft p-6">
        <div className="flex items-center gap-2 text-danger">
          <AlertTriangle size={18} />
          <h2 className="text-heading font-semibold">Not signed in</h2>
        </div>
      </div>
    );
  }

  let profile: ProfileRow | null = null;
  let lastSignInAt: string | null = null;

  if (session.mode === "supabase" && session.userId) {
    const service = getSupabaseService();
    if (service) {
      const { data } = await service
        .from("profiles")
        .select("id,email,role,created_at,full_name")
        .eq("id", session.userId)
        .maybeSingle();
      profile = (data as ProfileRow | null) ?? null;
      try {
        const admin = (service.auth as { admin?: { getUserById: (id: string) => Promise<{ data: { user: { last_sign_in_at?: string | null } | null } }> } }).admin;
        if (admin) {
          const { data: userResp } = await admin.getUserById(session.userId);
          lastSignInAt = userResp?.user?.last_sign_in_at ?? null;
        }
      } catch {
        /* ignore — non-critical */
      }
    }
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="animate-fade-up">
        <h1 className="hidden text-title font-medium text-ink md:block">Account</h1>
        <p className="text-body text-muted md:mt-1">
          {isAdmin
            ? "Your portal identity, session, and admin controls."
            : "Your portal identity and session."}
        </p>
      </header>

      {/* Identity */}
      <section className="animate-fade-up rounded-card border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-card bg-system-soft text-system">
            <User2 size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-heading font-medium text-ink">
              {profile?.full_name || profile?.email || session.email || "Portal user"}
            </div>
            <div className="tabular-nums mt-0.5 text-caption text-muted">
              {session.mode === "supabase" ? "Supabase Auth" : "Shared password session"}
            </div>
          </div>
        </div>

        {session.mode === "supabase" && isAdmin ? (
          <p className="mt-4 text-body">
            <Link href="/admin" className="font-medium text-ink underline underline-offset-2 hover:text-muted">
              Open admin
            </Link>
            <span className="text-muted"> — user stats and tools</span>
          </p>
        ) : null}

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={<Mail size={13} />} label="Email">
            {session.email ?? profile?.email ?? (
              <span className="text-muted">Not linked to an account</span>
            )}
          </InfoRow>
          <InfoRow icon={<Shield size={13} />} label="Role">
            {session.mode === "supabase" ? (
              <span className="font-mono text-body-sm uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-ink">
                {profile?.role ?? "member"}
              </span>
            ) : (
              <span className="text-muted">Shared access</span>
            )}
          </InfoRow>
          <InfoRow icon={<KeyRound size={13} />} label="Last sign-in">
            {lastSignInAt ? (
              <span className="tabular-nums text-body-sm text-ink">
                {new Date(lastSignInAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            ) : (
              <span className="text-muted">Unknown</span>
            )}
          </InfoRow>
          <InfoRow icon={<ShieldCheck size={13} />} label="Auth mode">
            <span className="tabular-nums text-body-sm text-ink">
              {session.mode === "supabase" ? "Email + password / magic link" : "Shared password"}
            </span>
          </InfoRow>
        </dl>
      </section>

      <InstallAppCard />

      {/* Sign out */}
      <section className="animate-fade-up rounded-card border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-body font-medium text-ink">Session</h2>
            <p className="mt-1 text-body-sm text-muted">
              Sign out to end this session on this device.
            </p>
          </div>
          <SignOutButton />
        </div>
      </section>

    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-body text-ink">{children}</dd>
    </div>
  );
}
