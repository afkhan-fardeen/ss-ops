import { AlertTriangle, KeyRound, Mail, Shield, ShieldCheck, User2 } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseService } from "@/lib/supabase/service";
import { SignOutButton } from "@/components/account/SignOutButton";
import { RegisterWebhooksButton } from "@/components/account/RegisterWebhooksButton";
import { CronStatus } from "@/components/sync/CronStatus";

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
      <div className="mx-auto max-w-2xl rounded-card border border-portal-red/25 bg-portal-redSoft p-6 text-portal-text">
        <div className="flex items-center gap-2 text-portal-red">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Not signed in</h2>
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
        // auth.admin is available on the service-role client.
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
  const webhookSecretConfigured = Boolean(process.env.SHOPIFY_WEBHOOK_SECRET);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="animate-fade-up">
        <h1 className="font-display text-xl font-semibold text-portal-text">Account</h1>
        <p className="mt-1 text-[13px] text-portal-text2">
          Your portal identity, session, and admin controls.
        </p>
      </header>

      {/* Identity */}
      <section className="animate-fade-up rounded-card border border-portal-border bg-portal-bg2 p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-card bg-portal-accentSoft text-portal-accent">
            <User2 size={18} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-semibold text-portal-text">
              {profile?.full_name || profile?.email || session.email || "Portal user"}
            </div>
            <div className="mt-0.5 font-mono text-[11.5px] text-portal-text3">
              {session.mode === "supabase" ? "Supabase Auth" : "Shared password session"}
            </div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={<Mail size={13} />} label="Email">
            {session.email ?? profile?.email ?? (
              <span className="text-portal-text3">Not linked to an account</span>
            )}
          </InfoRow>
          <InfoRow icon={<Shield size={13} />} label="Role">
            {session.mode === "supabase" ? (
              <span className="font-mono text-[12px] uppercase tracking-wider text-portal-text">
                {profile?.role ?? "member"}
              </span>
            ) : (
              <span className="text-portal-text2">Shared access</span>
            )}
          </InfoRow>
          <InfoRow icon={<KeyRound size={13} />} label="Last sign-in">
            {lastSignInAt ? (
              <span className="font-mono text-[12px] text-portal-text">
                {new Date(lastSignInAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            ) : (
              <span className="text-portal-text3">Unknown</span>
            )}
          </InfoRow>
          <InfoRow icon={<ShieldCheck size={13} />} label="Auth mode">
            <span className="font-mono text-[12px] text-portal-text">
              {session.mode === "supabase" ? "Email + password / magic link" : "Shared password"}
            </span>
          </InfoRow>
        </dl>
      </section>

      {/* Sign out */}
      <section className="animate-fade-up rounded-card border border-portal-border bg-portal-bg2 p-5 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-portal-text">Session</h2>
            <p className="mt-1 text-[12.5px] text-portal-text2">
              Sign out to end this session on this device.
            </p>
          </div>
          <SignOutButton />
        </div>
      </section>

      {/* Admin: webhooks + cron status */}
      {session.mode === "supabase" && isAdmin ? (
        <>
          <section className="animate-fade-up rounded-card border border-portal-border bg-portal-bg2 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-portal-text">
                  <Shield size={14} className="text-portal-accent" /> Shopify webhooks
                </h2>
                <p className="mt-1 text-[12.5px] text-portal-text2">
                  Register order and fulfillment webhooks so the portal stays live.
                </p>
                <p className="mt-2 text-[11.5px] font-mono text-portal-text3">
                  SHOPIFY_WEBHOOK_SECRET:{" "}
                  <span className={webhookSecretConfigured ? "text-portal-green" : "text-portal-red"}>
                    {webhookSecretConfigured ? "configured" : "missing"}
                  </span>
                </p>
              </div>
              <RegisterWebhooksButton disabled={!webhookSecretConfigured} />
            </div>
          </section>

          <section className="animate-fade-up">
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-portal-text">Auto-Sync Status</h2>
              <p className="mt-0.5 text-[12.5px] text-portal-text2">
                Monitors Ubex delivery status and auto-fulfils Shopify orders. Runs every 15 minutes.
              </p>
            </div>
            <CronStatus />
          </section>
        </>
      ) : null}
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
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-portal-text3">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-[13px] text-portal-text">{children}</dd>
    </div>
  );
}
