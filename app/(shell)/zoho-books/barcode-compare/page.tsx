import { GitCompare } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { BarcodeCompareView } from "@/components/zoho-books/BarcodeCompareView";

export const dynamic = "force-dynamic";

export default async function ZohoBarcodeComparePage() {
  if (!(await canAccessModule("zohoBooks"))) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          Zoho Books is only available to admins or users granted the Zoho Books module.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-card bg-zoho-books-bg text-zoho-books">
            <GitCompare size={20} />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">Barcode Compare</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              Match Zoho Ubex Barcode values to Ubex inventory barcodes from a saved catalog.
              Read-only — no data is changed.
            </p>
          </div>
        </div>
      </header>

      <BarcodeCompareView />
    </div>
  );
}
