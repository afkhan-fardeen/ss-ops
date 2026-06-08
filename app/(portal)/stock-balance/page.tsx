import { Scale } from "lucide-react";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { StockBalanceLoader } from "@/components/stock/StockBalanceLoader";

export const dynamic = "force-dynamic";

export default async function StockBalancePage() {
  if (!(await isPortalAdmin())) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-[#EBEBEB] bg-white p-8 shadow-soft">
        <h1 className="text-lg font-semibold text-[#111111]">Access denied</h1>
        <p className="mt-2 text-[13px] text-[#555555]">
          Stock balance is only available to accounts with the admin role in Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-card bg-[#F7F7F7] text-[#111111]">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#111111]">Stock balance</h1>
            <p className="mt-0.5 text-[13px] text-[#555555]">
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
