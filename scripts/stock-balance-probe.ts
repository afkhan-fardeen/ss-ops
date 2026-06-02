/**
 * Read-only probe: Ubex inventory + Shopify location/inventory by barcode.
 *
 * Run: npx tsx scripts/stock-balance-probe.ts
 *
 * Never calls write endpoints (no inventorySet, no Ubex edit).
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

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

async function main() {
  const { fetchUbexInventoryPage } = await import("@/lib/ubex/inventory");
  const { getDefaultShopifyLocation, fetchShopifyVariantsByBarcode } = await import(
    "@/lib/shopify/inventory-read"
  );
  const { summarizeStockBalanceRows } = await import("@/lib/stock/build-balance-rows");

  console.log("Stock balance probe (read-only)\n");

  const page1 = await fetchUbexInventoryPage(1);
  console.log(`Ubex page 1: ${page1.length} items`);
  const sampleBarcodes = page1
    .map((i) => i.barcode.trim())
    .filter(Boolean)
    .slice(0, 5);
  console.log(`Sample barcodes: ${sampleBarcodes.join(", ") || "(none)"}\n`);

  const location = await getDefaultShopifyLocation();
  console.log(`Shopify location: ${location.name} (id ${location.id})\n`);

  if (sampleBarcodes.length > 0) {
    console.log("Shopify inventory (first 5 barcodes):");
    console.log(
      `${pad("Barcode", 16)} ${pad("On hand", 8)} ${pad("Avail", 8)} ${pad("Commit", 8)}`,
    );
    for (const bc of sampleBarcodes) {
      const variants = await fetchShopifyVariantsByBarcode(bc, location.id);
      if (variants.length === 0) {
        console.log(`${pad(bc, 16)} ${pad("—", 8)} ${pad("—", 8)} ${pad("—", 8)}  (unlinked)`);
      } else if (variants.length > 1) {
        console.log(`${pad(bc, 16)} ${pad("—", 8)} ${pad("—", 8)} ${pad("—", 8)}  (ambiguous: ${variants.length})`);
      } else {
        const v = variants[0]!;
        console.log(
          `${pad(bc, 16)} ${pad(String(v.onHand), 8)} ${pad(String(v.available), 8)} ${pad(String(v.committed), 8)}`,
        );
      }
    }
    console.log("");
  }

  const { loadStockBalancePreview } = await import("@/lib/stock/load-stock-balance-preview");
  const preview = await loadStockBalancePreview();
  const summary = summarizeStockBalanceRows(preview.rows);

  console.log("Join summary:");
  console.log(`  Matched:   ${summary.matched}`);
  console.log(`  Unlinked:  ${summary.unlinked}`);
  console.log(`  Ambiguous: ${summary.ambiguous}`);
  console.log(`  Skipped:   ${summary.skipped}`);
  console.log(`  Mismatch (Δ≠0): ${summary.mismatched}`);
  console.log(`\nLoaded ${preview.itemCount} Ubex items at ${preview.fetchedAt}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
