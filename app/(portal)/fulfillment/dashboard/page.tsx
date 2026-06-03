import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";

export default function FulfillmentDashboardPage() {
  return (
    <ModuleDashboardShell
      moduleId="fulfillment"
      title="Fulfillment dashboard"
      description="Push Ubex tracking to Shopify and review fulfillment history."
    >
      <ModuleQuickLinks
        moduleId="fulfillment"
        links={[
          { label: "Fulfillment list", href: "/fulfillment/list", description: "Today's fulfillment queue" },
          { label: "History", href: "/fulfillment/history", description: "Past fulfillment pushes" },
          { label: "Settings", href: "/fulfillment/settings", description: "Tracking and notify options" },
        ]}
      />
    </ModuleDashboardShell>
  );
}
