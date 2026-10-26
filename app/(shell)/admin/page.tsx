import Link from "next/link";
import { Users, ShieldCheck, Clock, History, Activity } from "lucide-react";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { getSupabaseService } from "@/lib/supabase/service";
import { getAllProfiles } from "@/lib/supabase/profiles";
import {
  getAuthLastSignInMap,
  getRecentPortalLogins,
} from "@/lib/supabase/portal-login-log";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { UserModuleEditor } from "@/components/admin/UserModuleEditor";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { RegisterWebhooksButton } from "@/components/account/RegisterWebhooksButton";
import { CronStatus } from "@/components/sync/CronStatus";

export const dynamic = "force-dynamic";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function modulesSummary(allowed: string[] | null): string {
  if (allowed === null) return "Full access";
  if (allowed.length === 0) return "No modules";
  return allowed.join(", ");
}

export default async function AdminPage() {
  if (!(await isPortalAdmin())) {
    return (
      <ModuleAccessDenied description="Admin is only available to accounts with the admin role in Supabase." />
    );
  }

  const service = getSupabaseService();
  let totalUsers: number | null = null;
  if (service) {
    const { count, error } = await service
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (!error) totalUsers = count ?? 0;
  }

  const profiles = await getAllProfiles();
  const [lastSignInMap, recentLogins] = await Promise.all([
    getAuthLastSignInMap(profiles.map((p) => p.id)),
    getRecentPortalLogins(50),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <DashboardHeader
          moduleLabel="Admin"
          title="Admin tools"
          description="Create users, control module access, manage integrations and review login activity."
        />
        <Link
          href="/admin/health"
          className="focus-ring mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-card border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
        >
          <Activity size={13} />
          System health
        </Link>
      </div>

      {/* User count */}
      <section className="animate-fade-up rounded-card border border-line bg-white p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-canvas text-ink">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-ink">Total users</h2>
            <p className="mt-0.5 text-fs12 text-muted">
              Rows in the profiles table (Supabase sign-ups).
            </p>
            <p className="mt-3 font-mono text-2xl font-medium tabular-nums text-ink">
              {totalUsers === null ? (
                <span className="text-base font-normal text-primary">
                  Could not load (check service key)
                </span>
              ) : (
                totalUsers
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="animate-fade-up">
        <CreateUserForm />
      </section>

      {/* Module access + last sign-in */}
      <section className="animate-fade-up space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-muted" />
          <h2 className="text-sm font-medium text-ink">Module access</h2>
        </div>
        <p className="text-fs13 text-muted">
          Control which modules each user can open. Admins always see all modules.
        </p>

        {profiles.length === 0 ? (
          <div className="rounded-card border border-line bg-white p-5 shadow-soft text-fs13 text-muted">
            No users found.
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((profile) => {
              const lastSignIn = lastSignInMap.get(profile.id) ?? null;
              return (
                <div
                  key={profile.id}
                  className="rounded-card border border-line bg-white p-4 shadow-soft"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-fs13 font-medium text-ink">
                        {profile.full_name ?? profile.email}
                      </p>
                      {profile.full_name && (
                        <p className="truncate font-mono text-fs11 text-muted">
                          {profile.email}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-fs11 text-muted">
                        <Clock size={11} />
                        Last sign-in:{" "}
                        <span className="font-mono text-ink">{formatWhen(lastSignIn)}</span>
                      </p>
                      <p className="mt-0.5 text-fs11 text-muted">
                        Modules: {modulesSummary(profile.allowed_modules)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-fs11 font-medium capitalize ${
                        profile.role === "admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-canvas text-muted"
                      }`}
                    >
                      {profile.role}
                    </span>
                  </div>

                  {profile.role === "admin" ? (
                    <p className="text-fs12 text-muted italic">
                      Admins always have full access.
                    </p>
                  ) : (
                    <UserModuleEditor user={profile} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Integrations */}
      <section className="animate-fade-up space-y-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-muted" />
          <h2 className="text-sm font-medium text-ink">Integrations</h2>
        </div>

        <div className="rounded-card border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h3 className="text-fs14 font-semibold text-ink">Shopify webhooks</h3>
              <p className="mt-1 text-fs13 text-muted">
                Register order and fulfillment webhooks so the portal stays live.
              </p>
              <p className="mt-2 font-mono text-fs12 text-muted">
                SHOPIFY_WEBHOOK_SECRET:{" "}
                <span className={process.env.SHOPIFY_WEBHOOK_SECRET ? "text-emerald-700" : "text-red-700"}>
                  {process.env.SHOPIFY_WEBHOOK_SECRET ? "configured" : "missing"}
                </span>
              </p>
            </div>
            <RegisterWebhooksButton disabled={!process.env.SHOPIFY_WEBHOOK_SECRET} />
          </div>
        </div>

        <div>
          <h3 className="mb-1 text-fs14 font-semibold text-ink">Seissense Ops Bot</h3>
          <p className="mb-2 text-fs13 text-muted">
            Auto-fulfills Shopify orders from Ubex delivery status. Scheduled runs are paused — use the buttons to run it manually.
          </p>
          <CronStatus />
        </div>
      </section>

      {/* Recent login history */}
      <section className="animate-fade-up space-y-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-muted" />
          <h2 className="text-sm font-medium text-ink">Recent logins</h2>
        </div>
        <p className="text-fs13 text-muted">
          Successful staff sign-ins (password and magic link). Admin-only.
        </p>

        {recentLogins.length === 0 ? (
          <div className="rounded-card border border-line bg-white p-5 shadow-soft text-fs13 text-muted">
            No login events recorded yet. Events appear after the next staff sign-in.
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
            <table className="w-full text-left text-fs12">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-fs11 uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {recentLogins.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-mono text-ink whitespace-nowrap">
                      {formatWhen(row.logged_in_at)}
                    </td>
                    <td className="px-4 py-2.5 text-ink">{row.email ?? "—"}</td>
                    <td className="hidden px-4 py-2.5 font-mono text-muted sm:table-cell">
                      {row.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
