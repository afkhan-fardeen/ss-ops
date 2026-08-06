import { Users, ShieldCheck, Clock, History } from "lucide-react";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { getSupabaseService } from "@/lib/supabase/service";
import { getAllProfiles } from "@/lib/supabase/profiles";
import {
  getAuthLastSignInMap,
  getRecentPortalLogins,
} from "@/lib/supabase/portal-login-log";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { UserModuleEditor } from "@/components/admin/UserModuleEditor";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

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
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          Admin is only available to accounts with the admin role in Supabase.
        </p>
      </div>
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
      <DashboardHeader
        moduleLabel="Admin"
        title="Admin tools"
        description="Create users, control module access, and review login activity."
      />

      {/* User count */}
      <section className="animate-fade-up rounded-card border border-line bg-white p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-canvas text-ink">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-ink">Total users</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Rows in the profiles table (Supabase sign-ups).
            </p>
            <p className="mt-3 font-mono text-2xl font-medium tabular-nums text-ink">
              {totalUsers === null ? (
                <span className="text-base font-normal text-fulfillment">
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
        <p className="text-[13px] text-muted">
          Control which module cards each user sees on their launcher. Admins always
          see all modules regardless of this setting.
        </p>

        {profiles.length === 0 ? (
          <div className="rounded-card border border-line bg-white p-5 shadow-soft text-[13px] text-muted">
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
                      <p className="truncate text-[13px] font-medium text-ink">
                        {profile.full_name ?? profile.email}
                      </p>
                      {profile.full_name && (
                        <p className="truncate font-mono text-[11px] text-muted">
                          {profile.email}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                        <Clock size={11} />
                        Last sign-in:{" "}
                        <span className="font-mono text-ink">{formatWhen(lastSignIn)}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        Modules: {modulesSummary(profile.allowed_modules)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                        profile.role === "admin"
                          ? "bg-gold/10 text-gold"
                          : "bg-canvas text-muted"
                      }`}
                    >
                      {profile.role}
                    </span>
                  </div>

                  {profile.role === "admin" ? (
                    <p className="text-[12px] text-muted italic">
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

      {/* Recent login history */}
      <section className="animate-fade-up space-y-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-muted" />
          <h2 className="text-sm font-medium text-ink">Recent logins</h2>
        </div>
        <p className="text-[13px] text-muted">
          Successful staff sign-ins (password and magic link). Admin-only.
        </p>

        {recentLogins.length === 0 ? (
          <div className="rounded-card border border-line bg-white p-5 shadow-soft text-[13px] text-muted">
            No login events recorded yet. Events appear after the next staff sign-in.
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-[11px] uppercase tracking-wider text-muted">
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
