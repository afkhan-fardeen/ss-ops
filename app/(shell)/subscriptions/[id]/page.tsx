import { notFound } from "next/navigation";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { SubscriptionDetailView } from "@/components/subscriptions/SubscriptionDetailView";
import { getSubscriptionRequest } from "@/lib/subscriptions/db";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  if (!(await canAccessModule("subscriptions"))) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          You need the Subscriptions module grant to view requests.
        </p>
      </div>
    );
  }

  const { id } = await Promise.resolve(params);
  const row = await getSubscriptionRequest(id);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <DashboardHeader
        moduleId="subscriptions"
        moduleLabel="Subscriptions"
        title={row.reference_number}
        description={`${row.subscription_name} · ${row.employee_name}`}
      />
      <SubscriptionDetailView row={row} />
    </div>
  );
}
