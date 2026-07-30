import { Users, ShieldCheck } from "lucide-react";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { getSupabaseService } from "@/lib/supabase/service";
import { getAllProfiles } from "@/lib/supabase/profiles";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { UserModuleEditor } from "@/components/admin/UserModuleEditor";

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DashboardHeader
        moduleLabel="Admin"
        title="Admin tools"
        description="User directory and module access control."
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

      {/* Module access control */}
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
            {profiles.map((profile) => (
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
