import { Suspense } from "react";
import { isStore2Configured } from "@/lib/store2/client";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { AwbLookupView } from "@/components/awb/AwbLookupView";

export const metadata = {
  title: "AWB Lookup — Seissense Ops",
};

function AwbSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-[88px] rounded-card bg-line/30" />
    </div>
  );
}

export default async function AwbPage() {
  const storeCount: 1 | 2 = isStore2Configured() ? 2 : 1;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <DashboardHeader
        moduleId="awb"
        moduleLabel="AWB Lookup"
        title="Airway Bill Lookup"
        description="Enter an order number to retrieve and preview the UBEX Airway Bill PDF."
      />
      <Suspense fallback={<AwbSkeleton />}>
        <AwbLookupView storeCount={storeCount} />
      </Suspense>
    </div>
  );
}
