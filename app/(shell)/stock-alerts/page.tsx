import { Bell } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { StockAlertsLoader } from "@/components/stock-alerts/StockAlertsLoader";

export const dynamic = "force-dynamic";

export default async function StockAlertsPage() {
  if (!(await canAccessModule("stockAlerts"))) {
    return (
      <ModuleAccessDenied description="Stock Alerts is only available to admins or users granted the Stock Alerts module." />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-card bg-stock-bg text-stock">
            <Bell size={20} />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">Stock Alerts</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              Products at risk of running out, based on current Ubex stock and recent sales pace.
            </p>
          </div>
        </div>
      </header>

      <StockAlertsLoader />
    </div>
  );
}
