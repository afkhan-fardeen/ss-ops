import Link from "next/link";
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
      <div className="mx-auto max-w-2xl rounded-card border border-[#C25151]/25 bg-[rgba(194,81,81,0.10)] p-6">
        <div className="flex items-center gap-2 text-[#C25151]">
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
        <h1 className="text-xl font-semibold text-[#111111]">Account</h1>
        <p className="mt-1 text-[13px] text-[#555555]">
          Your portal identity, session, and admin controls.
        </p>
      </header>

      {/* Identity */}
      <section className="animate-fade-up rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-card bg-[#F7F7F7] text-[#111111]">
            <User2 size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-[#111111]">
              {profile?.full_name || profile?.email || session.email || "Portal user"}
            </div>
            <div className="mt-0.5 font-mono text-[11.5px] text-[#999999]">
              {session.mode === "supabase" ? "Supabase Auth" : "Shared password session"}
            </div>
          </div>
        </div>

        {session.mode === "supabase" && isAdmin ? (
          <p className="mt-4 text-[13px]">
            <Link href="/admin" className="font-medium text-[#111111] underline underline-offset-2 hover:text-[#555555]">
              Open admin
            </Link>
            <span className="text-[#999999]"> — user stats and tools</span>
          </p>
        ) : null}

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={<Mail size={13} />} label="Email">
            {session.email ?? profile?.email ?? (
              <span className="text-[#999999]">Not linked to an account</span>
            )}
          </InfoRow>
          <InfoRow icon={<Shield size={13} />} label="Role">
            {session.mode === "supabase" ? (
              <span className="font-mono text-[12px] uppercase tracking-wider text-[#111111]">
                {profile?.role ?? "member"}
              </span>
            ) : (
              <span className="text-[#555555]">Shared access</span>
            )}
          </InfoRow>
          <InfoRow icon={<KeyRound size={13} />} label="Last sign-in">
            {lastSignInAt ? (
              <span className="font-mono text-[12px] text-[#111111]">
                {new Date(lastSignInAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            ) : (
              <span className="text-[#999999]">Unknown</span>
            )}
          </InfoRow>
          <InfoRow icon={<ShieldCheck size={13} />} label="Auth mode">
            <span className="font-mono text-[12px] text-[#111111]">
              {session.mode === "supabase" ? "Email + password / magic link" : "Shared password"}
            </span>
          </InfoRow>
        </dl>
      </section>

      {/* Sign out */}
      <section className="animate-fade-up rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111111]">Session</h2>
            <p className="mt-1 text-[12.5px] text-[#555555]">
              Sign out to end this session on this device.
            </p>
          </div>
          <SignOutButton />
        </div>
      </section>

      {/* Seissense Ops Bot — visible to all roles */}
      <section className="animate-fade-up">
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-[#111111]">Seissense Ops Bot</h2>
          <p className="mt-0.5 text-[12.5px] text-[#555555]">
            Monitors Ubex delivery status and auto-fulfils Shopify orders. Runs daily at 5:00 PM Bahrain time.
          </p>
        </div>
        <CronStatus />
      </section>

      {/* Admin only: Shopify webhooks */}
      {session.mode === "supabase" && isAdmin ? (
        <section className="animate-fade-up rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#111111]">
                <Shield size={14} className="text-[#111111]" /> Shopify webhooks
              </h2>
              <p className="mt-1 text-[12.5px] text-[#555555]">
                Register order and fulfillment webhooks so the portal stays live.
              </p>
              <p className="mt-2 text-[11.5px] font-mono text-[#999999]">
                SHOPIFY_WEBHOOK_SECRET:{" "}
                <span className={webhookSecretConfigured ? "text-[#4CAF50]" : "text-[#C25151]"}>
                  {webhookSecretConfigured ? "configured" : "missing"}
                </span>
              </p>
            </div>
            <RegisterWebhooksButton disabled={!webhookSecretConfigured} />
          </div>
        </section>
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
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-[13px] text-[#111111]">{children}</dd>
    </div>
  );
}
