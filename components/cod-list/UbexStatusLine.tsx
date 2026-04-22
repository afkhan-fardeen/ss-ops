import { AlertTriangle, Info } from "lucide-react";

type RowLike = { ubexId?: string };

export function UbexStatusLine({
  tokenConfigured,
  codRows,
  linked: linkedProp,
  total: totalProp,
  rowNoun = "COD row",
  totalShipments,
  conflictsCount,
  apiMessage,
  error,
}: {
  tokenConfigured: boolean;
  /** Optional — pass rows and we count matched ubexId; or pass `linked`/`total` directly. */
  codRows?: RowLike[];
  linked?: number;
  total?: number;
  rowNoun?: string;
  totalShipments?: number;
  conflictsCount?: number;
  apiMessage?: string;
  error?: string;
}) {
  const linked = linkedProp ?? (codRows ?? []).filter((r) => r.ubexId && r.ubexId.trim()).length;
  const total = totalProp ?? (codRows ?? []).length;

  if (!tokenConfigured) {
    return (
      <div className="flex items-start gap-2 rounded-card border border-portal-amber/25 bg-portal-amberSoft px-3 py-2 text-[12px] text-portal-text">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-portal-amber" />
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
      <div className="flex items-start gap-2 rounded-card border border-portal-red/25 bg-portal-redSoft px-3 py-2 text-[12px] text-portal-text">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-portal-red" />
        <div>
          <div className="font-medium text-portal-red">Ubex Partner API is disabled for this account.</div>
          <p className="mt-0.5 text-portal-text2">
            API responded: <span className="font-mono text-[11px]">{apiMessage}</span>
          </p>
          <p className="mt-0.5 text-portal-text2">
            Contact Ubex to enable Partner API access for <code className="font-mono text-[11px]">Seissense</code>.
            Until then, UBEX IDs and tracking links cannot be populated.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-card border border-portal-red/25 bg-portal-redSoft px-3 py-2 text-[12px] text-portal-text">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-portal-red" />
        <div>
          <div className="font-medium text-portal-red">Couldn&apos;t fetch Ubex shipments.</div>
          <p className="mt-0.5 font-mono text-[11px] text-portal-text2">{error}</p>
        </div>
      </div>
    );
  }

  if (total === 0) return null;

  const hasConflicts = (conflictsCount ?? 0) > 0;

  return (
    <div className="flex items-start gap-2 text-[12px] text-portal-text2">
      <Info size={13} className="mt-0.5 shrink-0 text-portal-text3" />
      <p>
        Ubex linked <span className="font-medium text-portal-text">{linked}</span> of {total} {rowNoun}
        {total === 1 ? "" : "s"}
        {typeof totalShipments === "number" ? (
          <> (scanned {totalShipments} shipment{totalShipments === 1 ? "" : "s"})</>
        ) : null}
        .
        {hasConflicts ? (
          <>
            {" "}
            <span className="text-portal-amber">
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
