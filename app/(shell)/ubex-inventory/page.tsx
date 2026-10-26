import { Package } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { UbexInventoryView } from "@/components/ubex-inventory/UbexInventoryView";

export const dynamic = "force-dynamic";

export default async function UbexInventoryPage() {
  if (!(await canAccessModule("stock"))) {
    return (
      <ModuleAccessDenied description="Stock is only available to admins or users granted the Stock module." />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="hidden h-10 w-10 place-items-center md:grid rounded-card bg-inventory-soft text-inventory">
            <Package size={20} />
          </div>
          <div>
            <h1 className="hidden text-title font-medium text-ink md:block">Ubex inventory</h1>
            <p className="text-body text-muted md:mt-0.5">
              Live warehouse stock grouped by product name, with Shopify committed from both stores.
              Read-only — no sync.
            </p>
          </div>
        </div>
      </header>

      <UbexInventoryView />
    </div>
  );
}
