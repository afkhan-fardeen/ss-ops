export type CommitmentBreakdown = {
  totalCommitted: number;
  canBeSent: number;
  shortBy: number;
  trulyAvailable: number;
};

export type ShortProduct = {
  barcode: string;
  productName: string;
  shortBy: number;
  totalCommitted: number;
  ubexStock: number;
};

export type CommitmentCatalogSummary = {
  totalCommitted: number;
  canBeSent: number;
  productsShort: number;
  shortProducts: ShortProduct[];
};

function committedForStore(committed: number | null | undefined): number {
  return committed ?? 0;
}

export function computeCommitment(input: {
  ubexStock: number;
  storeACommitted: number | null | undefined;
  storeBCommitted: number | null | undefined;
}): CommitmentBreakdown {
  const totalCommitted =
    committedForStore(input.storeACommitted) + committedForStore(input.storeBCommitted);
  const canBeSent = Math.min(input.ubexStock, totalCommitted);
  const shortBy = Math.max(0, totalCommitted - input.ubexStock);
  const trulyAvailable = Math.max(0, input.ubexStock - totalCommitted);

  return { totalCommitted, canBeSent, shortBy, trulyAvailable };
}

export function buildCommitmentCatalogSummary(
  rows: Array<{
    barcode: string;
    productName: string;
    ubexStock: number;
    storeA: { committed: number | null };
    storeB: { committed: number | null } | null;
  }>,
): CommitmentCatalogSummary {
  let totalCommitted = 0;
  let canBeSent = 0;
  const shortProducts: ShortProduct[] = [];

  for (const row of rows) {
    if (!row.barcode) continue;
    const breakdown = computeCommitment({
      ubexStock: row.ubexStock,
      storeACommitted: row.storeA.committed,
      storeBCommitted: row.storeB?.committed,
    });
    totalCommitted += breakdown.totalCommitted;
    canBeSent += breakdown.canBeSent;
    if (breakdown.shortBy > 0) {
      shortProducts.push({
        barcode: row.barcode,
        productName: row.productName,
        shortBy: breakdown.shortBy,
        totalCommitted: breakdown.totalCommitted,
        ubexStock: row.ubexStock,
      });
    }
  }

  shortProducts.sort((a, b) => b.shortBy - a.shortBy);

  return {
    totalCommitted,
    canBeSent,
    productsShort: shortProducts.length,
    shortProducts: shortProducts.slice(0, 15),
  };
}
