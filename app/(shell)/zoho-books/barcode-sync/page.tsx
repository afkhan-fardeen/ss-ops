import { Barcode } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { BarcodeSyncView } from "@/components/zoho-books/BarcodeSyncView";

export const dynamic = "force-dynamic";

export default async function ZohoBarcodeSyncPage() {
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
            <Barcode size={20} />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">Zoho Barcode Sync</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              Fill the Ubex Barcode field on Zoho items from matching Shopify SKUs. Manual review
              required — nothing writes without your confirmation.
            </p>
          </div>
        </div>
      </header>

      <BarcodeSyncView />
    </div>
  );
}
