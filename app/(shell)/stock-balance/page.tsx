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
          <div className="grid h-10 w-10 place-items-center rounded-card bg-canvas text-ink">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">Stock balance</h1>
            <p className="mt-0.5 text-[13px] text-muted">
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
