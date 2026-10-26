import { Scale } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { StockBalanceLoader } from "@/components/stock/StockBalanceLoader";

export const dynamic = "force-dynamic";

export default async function StockBalancePage() {
  if (!(await canAccessModule("stock"))) {
    return (
      <ModuleAccessDenied description="Stock balance is only available to admins or users granted the Stock Balance module." />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="hidden h-10 w-10 place-items-center md:grid rounded-card bg-canvas text-ink">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="hidden text-title font-medium text-ink md:block">Stock balance</h1>
            <p className="text-body text-muted md:mt-0.5">
              Compare Ubex sellable stock with Shopify (on hand, available, committed). Δ is Ubex vs
              available; joined by barcode.
            </p>
          </div>
        </div>
      </header>

      <StockBalanceLoader />
    </div>
  );
}
