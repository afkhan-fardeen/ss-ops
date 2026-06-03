import Link from "next/link";
import { getLastNWindows, shortWindowLabel } from "@/lib/datetime/collection-window";
import { loadCodEmailHistory } from "@/lib/cod/load-cod-email-history";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";

export const dynamic = "force-dynamic";

export default async function CodDashboardPage() {
  const todayWindow = getLastNWindows(1)[0];
  const { rows } = await loadCodEmailHistory();
  const lastEmail = rows[0];

  return (
    <ModuleDashboardShell
      moduleId="cod"
      title="COD dashboard"
      description="Collection windows, order list, email history, and recipient settings."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-[#EBEBEB] bg-white p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
            Current window
          </p>
          <p className="mt-1 text-[14px] font-medium text-[#111111]">
            {todayWindow ? shortWindowLabel(todayWindow) : "—"}
          </p>
        </div>
        <div className="rounded-card border border-[#EBEBEB] bg-white p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
            Last COD email
          </p>
          <p className="mt-1 text-[14px] font-medium text-[#111111]">
            {lastEmail
              ? `${lastEmail.orderCount} orders · ${new Date(lastEmail.sentAt).toLocaleDateString()}`
              : "None sent yet"}
          </p>
        </div>
      </div>
      <ModuleQuickLinks
        moduleId="cod"
        links={[
          { label: "COD List", href: "/cod/list", description: "View and export today's COD orders" },
          { label: "History", href: "/cod/history", description: "Past COD email sends" },
          { label: "Settings", href: "/cod/settings", description: "Email recipients" },
        ]}
      />
      <Link
        href="/cod/list"
        className="inline-flex rounded-card border border-blue-600 bg-blue-600 px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
      >
        Open COD List
      </Link>
    </ModuleDashboardShell>
  );
}
