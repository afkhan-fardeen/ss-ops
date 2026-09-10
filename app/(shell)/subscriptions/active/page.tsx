import { canAccessModule } from "@/lib/auth/can-access-module";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { ActiveSubscriptionsView } from "@/components/subscriptions/ActiveSubscriptionsView";
import { listSubscriptionRequests } from "@/lib/subscriptions/db";

export const dynamic = "force-dynamic";

export default async function ActiveSubscriptionsPage() {
  if (!(await canAccessModule("subscriptions"))) {
    return (
      <ModuleAccessDenied description="You need the Subscriptions module grant to view active subscriptions." />
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
