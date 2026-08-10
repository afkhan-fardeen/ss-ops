import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { ActiveSubscriptionsView } from "@/components/subscriptions/ActiveSubscriptionsView";
import { listSubscriptionRequests } from "@/lib/subscriptions/db";

export const dynamic = "force-dynamic";

export default async function ActiveSubscriptionsPage() {
  if (!(await isPortalAdmin())) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">Subscriptions admin is for portal admins only.</p>
      </div>
    );
  }

  const rows = await listSubscriptionRequests("approved");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <DashboardHeader
        moduleId="subscriptions"
        moduleLabel="Subscriptions"
        title="Active subscriptions"
        description="Approved subscription requests — who has what, cost, and billing cycle."
      />
      <ActiveSubscriptionsView rows={rows} />
    </div>
  );
}
