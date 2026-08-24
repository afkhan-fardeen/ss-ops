import { Package } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { UbexInventoryView } from "@/components/ubex-inventory/UbexInventoryView";

export const dynamic = "force-dynamic";

export default async function UbexInventoryPage() {
  if (!(await canAccessModule("ubexInventory"))) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          Ubex inventory is only available to admins or users granted the Ubex Inventory module.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-card bg-canvas text-ink">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">Ubex inventory</h1>
            <p className="mt-0.5 text-[13px] text-muted">
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
