import { Users } from "lucide-react";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { getSupabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isPortalAdmin())) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-[#EBEBEB] bg-white p-8 shadow-soft">
        <h1 className="text-lg font-semibold text-[#111111]">Access denied</h1>
        <p className="mt-2 text-[13px] text-[#555555]">
          Admin is only available to accounts with the admin role in Supabase.
        </p>
      </div>
    );
  }

  const service = getSupabaseService();
  let totalUsers: number | null = null;
  if (service) {
    const { count, error } = await service.from("profiles").select("*", { count: "exact", head: true });
    if (!error) totalUsers = count ?? 0;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="animate-fade-up">
        <h1 className="text-xl font-semibold text-[#111111]">Admin</h1>
        <p className="mt-1 text-[13px] text-[#555555]">Directory and usage (more soon).</p>
      </header>

      <section className="animate-fade-up rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-[#F7F7F7] text-[#111111]">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#111111]">Total users</h2>
            <p className="mt-0.5 text-[12.5px] text-[#555555]">Rows in the profiles table (Supabase sign-ups).</p>
            <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-[#111111]">
              {totalUsers === null ? (
                <span className="text-base font-normal text-[#C25151]">Could not load (check service key)</span>
              ) : (
                totalUsers
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
