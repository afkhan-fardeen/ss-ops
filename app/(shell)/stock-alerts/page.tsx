import { Bell } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { StockAlertsLoader } from "@/components/stock-alerts/StockAlertsLoader";

export const dynamic = "force-dynamic";

export default async function StockAlertsPage() {
  if (!(await canAccessModule("stock"))) {
    return (
      <ModuleAccessDenied description="Stock is only available to admins or users granted the Stock module." />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="hidden h-10 w-10 place-items-center md:grid rounded-card bg-primary-soft text-primary">
            <Bell size={20} />
          </div>
          <div>
            <h1 className="hidden text-xl font-medium text-ink md:block">Stock Alerts</h1>
            <p className="text-fs13 text-muted md:mt-0.5">
              Products at risk of running out, based on current Ubex stock and recent sales pace.
            </p>
          </div>
        </div>
      </header>

      <StockAlertsLoader />
    </div>
  );
}
