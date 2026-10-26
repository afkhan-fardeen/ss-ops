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
      <div className="flex items-start gap-2 rounded-card border border-warning/25 bg-warning-soft px-3 py-2 text-body-sm text-ink">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
        <p>
          Add a non-empty <code className="font-mono text-caption">UBEX_API_TOKEN</code> in{" "}
          <code className="font-mono text-caption">.env</code> and restart{" "}
          <code className="font-mono text-caption">npm run dev</code>. Matching uses the last 4 digits of the Shopify
          order number against Ubex shipment references.
        </p>
      </div>
    );
  }

  if (apiMessage) {
    return (
      <div className="flex items-start gap-2 rounded-card border border-danger/25 bg-danger-soft px-3 py-2 text-body-sm text-ink">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
        <div>
          <div className="font-medium text-danger">Ubex Partner API is disabled for this account.</div>
          <p className="mt-0.5 text-muted">
            API responded: <span className="font-mono text-caption">{apiMessage}</span>
          </p>
          <p className="mt-0.5 text-muted">
            Contact Ubex to enable Partner API access for <code className="font-mono text-caption">Seissense</code>.
            Until then, UBEX IDs and tracking links cannot be populated.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-card border border-danger/25 bg-danger-soft px-3 py-2 text-body-sm text-ink">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
        <div>
          <div className="font-medium text-danger">Couldn&apos;t fetch Ubex shipments.</div>
          <p className="mt-0.5 font-mono text-caption text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (total === 0) return null;

  const hasConflicts = (conflictsCount ?? 0) > 0;

  return (
    <div className="flex items-start gap-2 text-body-sm text-muted">
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
            <span className="text-warning">
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
