import { AlertTriangle } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { StockErrorsView } from "@/components/stock/StockErrorsView";

export const dynamic = "force-dynamic";

export default async function StockBalanceErrorsPage() {
  if (!(await canAccessModule("stock"))) {
    return (
      <ModuleAccessDenied description="Stock balance errors are only available to admins or users granted the Stock Balance module." />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="hidden h-10 w-10 place-items-center md:grid rounded-card bg-canvas text-ink">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h1 className="hidden text-title font-medium text-ink md:block">Stock balance errors</h1>
            <p className="text-body text-muted md:mt-0.5">
              What is currently broken or unsynced — data-quality issues and unresolved sync
              failures.
            </p>
          </div>
        </div>
      </header>

      <StockErrorsView />
    </div>
  );
}
