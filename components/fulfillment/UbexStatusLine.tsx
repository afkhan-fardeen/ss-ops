import { AlertTriangle, Info } from "lucide-react";

export function UbexStatusLine({
  tokenConfigured,
  linked: linkedProp,
  total: totalProp,
  rowNoun = "order",
  totalShipments,
  conflictsCount,
  apiMessage,
  error,
}: {
  tokenConfigured: boolean;
  linked?: number;
  total?: number;
  rowNoun?: string;
  totalShipments?: number;
  conflictsCount?: number;
  apiMessage?: string;
  error?: string;
}) {
  const linked = linkedProp ?? 0;
  const total = totalProp ?? 0;

  if (!tokenConfigured) {
    return (
      <div className="flex items-start gap-2 rounded-card border border-[#D97706]/25 bg-[rgba(217,119,6,0.12)] px-3 py-2 text-[12px] text-ink">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#D97706]" />
        <p>
          Add a non-empty <code className="font-mono text-[11px]">UBEX_API_TOKEN</code> in{" "}
          <code className="font-mono text-[11px]">.env</code> and restart{" "}
          <code className="font-mono text-[11px]">npm run dev</code>. Matching uses the last 4 digits of the Shopify
          order number against Ubex shipment references.
        </p>
      </div>
    );
  }

  if (apiMessage) {
    return (
      <div className="flex items-start gap-2 rounded-card border border-[#DC2626]/25 bg-[rgba(220,38,38,0.10)] px-3 py-2 text-[12px] text-ink">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#DC2626]" />
        <div>
          <div className="font-medium text-[#DC2626]">Ubex Partner API is disabled for this account.</div>
          <p className="mt-0.5 text-muted">
            API responded: <span className="font-mono text-[11px]">{apiMessage}</span>
          </p>
          <p className="mt-0.5 text-muted">
            Contact Ubex to enable Partner API access for <code className="font-mono text-[11px]">Seissense</code>.
            Until then, UBEX IDs and tracking links cannot be populated.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-card border border-[#DC2626]/25 bg-[rgba(220,38,38,0.10)] px-3 py-2 text-[12px] text-ink">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#DC2626]" />
        <div>
          <div className="font-medium text-[#DC2626]">Couldn&apos;t fetch Ubex shipments.</div>
          <p className="mt-0.5 font-mono text-[11px] text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (total === 0) return null;

  const hasConflicts = (conflictsCount ?? 0) > 0;

  return (
    <div className="flex items-start gap-2 text-[12px] text-muted">
      <Info size={13} className="mt-0.5 shrink-0 text-muted" />
      <p>
        Ubex linked <span className="font-medium text-ink">{linked}</span> of {total} {rowNoun}
        {total === 1 ? "" : "s"}
        {typeof totalShipments === "number" ? (
          <> (scanned {totalShipments} shipment{totalShipments === 1 ? "" : "s"})</>
        ) : null}
        .
        {hasConflicts ? (
          <>
            {" "}
            <span className="text-[#D97706]">
              {conflictsCount} last-4 collision{conflictsCount === 1 ? "" : "s"} skipped
            </span>{" "}
            to avoid mispushing.
          </>
        ) : null}
        {totalShipments === 0 ? (
          <>
            {" "}
            Ubex returned no shipments. Check that your Ubex hub has shipments created and that last 4 digits of the
            Shopify order number appear in a Ubex reference field.
          </>
        ) : null}
      </p>
    </div>
  );
}
