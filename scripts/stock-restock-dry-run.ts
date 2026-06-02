/**
 * Dry-run: resolve barcode → Ubex qty + Shopify GIDs. No writes.
 *
 * Run: npx tsx scripts/stock-restock-dry-run.ts [barcode]
 * If barcode omitted, picks the first mismatched row from the preview.
 */
import { readFileSync } from "node:fs";

function loadEnv(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* no env file */
  }
}

loadEnv(".env.local");
loadEnv(".env");

async function main() {
  const { fetchUbexInventoryUpTo, fetchUbexStockByIds } = await import("@/lib/ubex/inventory");
  const { getDefaultShopifyLocation, fetchShopifyVariantsByBarcode } = await import(
    "@/lib/shopify/inventory-read"
  );
  const { loadStockBalancePreview } = await import("@/lib/stock/load-stock-balance-preview");

  let barcode = (process.argv[2] ?? "").trim();
  let ubexId = "";

  if (!barcode) {
    const preview = await loadStockBalancePreview();
    const row = preview.rows.find(
      (r) => r.status === "matched" && r.delta !== null && r.delta !== 0,
    );
    if (!row) {
      console.log("No mismatched rows in preview. Pass a barcode explicitly.");
      process.exit(0);
    }
    barcode = row.barcode;
    ubexId = row.ubexId;
    console.log(`Auto-selected mismatch: ${row.productName}\n`);
  } else {
    const items = await fetchUbexInventoryUpTo();
    const hit = items.find((i) => i.barcode.trim() === barcode);
    if (!hit) {
      console.error(`Barcode ${barcode} not found in loaded Ubex inventory.`);
      process.exit(1);
    }
    ubexId = hit.id;
  }

  const location = await getDefaultShopifyLocation();
  const ubexQty = (await fetchUbexStockByIds([ubexId])).get(ubexId);
  const variants = await fetchShopifyVariantsByBarcode(barcode, location.id);

  console.log("Stock restock dry-run (no writes)\n");
  console.log(`Barcode:     ${barcode}`);
  console.log(`Ubex id:     ${ubexId}`);
  console.log(`Ubex qty:    ${ubexQty ?? "(unknown)"}`);
  console.log(`Location:    ${location.name} (${location.id})`);
  console.log(`Variants:    ${variants.length}`);

  if (variants.length !== 1) {
    console.log("\nCannot restock: need exactly one Shopify variant for this barcode.");
    process.exit(variants.length === 0 ? 1 : 1);
  }

  const v = variants[0]!;
  console.log(`Variant GID: ${v.variantId}`);
  console.log(`Item GID:    ${v.inventoryItemId}`);
  console.log(`Shopify:     on_hand ${v.onHand}, available ${v.available}, committed ${v.committed}`);
  console.log(`Target:      set on_hand → ${ubexQty ?? "?"}`);
  console.log(`Delta:       ${ubexQty !== undefined ? ubexQty - v.onHand : "?"}`);
  console.log("\nDry-run complete. No API writes were made.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
