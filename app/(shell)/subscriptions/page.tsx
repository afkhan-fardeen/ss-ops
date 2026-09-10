import { Suspense } from "react";
import { headers } from "next/headers";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { SubscriptionsListView } from "@/components/subscriptions/SubscriptionsListView";
import { listSubscriptionRequests } from "@/lib/subscriptions/db";
import type { SubscriptionStatus } from "@/lib/subscriptions/types";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  if (!(await canAccessModule("subscriptions"))) {
    return <ModuleAccessDenied description="You need the Subscriptions module grant to view requests." />;
  }

  const sp = await Promise.resolve(searchParams ?? {});
  const statusParam = sp.status ?? "pending";
  const status = (
    ["pending", "approved", "rejected", "all"].includes(statusParam)
      ? statusParam
      : "pending"
  ) as SubscriptionStatus | "all";

  const rows = await listSubscriptionRequests(status);
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const publicFormUrl = `${proto}://${host}/subscriptions/request`;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <DashboardHeader
        moduleId="subscriptions"
        moduleLabel="Subscriptions"
        title="Subscription requests"
        description="Review public form submissions, print filled PDFs, and approve or reject requests."
      />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-line/30" />}>
        <SubscriptionsListView rows={rows} publicFormUrl={publicFormUrl} />
      </Suspense>
    </div>
  );
}
