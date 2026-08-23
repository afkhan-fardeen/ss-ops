/**
 * One-shot backfill of `order_line_items` from the Shopify Admin API.
 *
 * Run with:
 *   npx tsx scripts/backfill-order-line-items.ts [days] [store]
 *
 * Defaults to the last 365 days, both stores. Reads env from .env.local / .env.
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
    /* no env file — that's fine */
  }
}

loadEnv(".env.local");
loadEnv(".env");

type StoreTarget = 1 | 2;

async function backfillStore(days: number, storeId: StoreTarget) {
  const { getSupabaseService } = await import("@/lib/supabase/service");
  const { upsertOrdersLineItems } = await import("@/lib/supabase/order-line-items");

  if (!getSupabaseService()) {
    console.error("Supabase is not configured.");
    process.exit(1);
  }

  const max = new Date();
  const min = new Date(Date.now() - days * 86400000);
  const filter = {
    createdAtMinIso: min.toISOString(),
    createdAtMaxIso: max.toISOString(),
    cacheStrategy: "live" as const,
  };

  const label = storeId === 1 ? "Store 1" : "Store 2";
  console.log(`Backfilling ${label} line items from ${min.toISOString()} → ${max.toISOString()}…`);

  const orders =
    storeId === 1
      ? (await import("@/lib/orders/fetch-orders")).fetchOrders(filter).then((r) => r.orders)
      : (await import("@/lib/store2/fetch-orders")).fetchStore2Orders(filter).then((r) => r.orders);

  const all = await orders;
  console.log(`Fetched ${all.length} orders from ${label}. Upserting line items…`);

  const chunk = 200;
  for (let i = 0; i < all.length; i += chunk) {
    const slice = all.slice(i, i + chunk);
    await upsertOrdersLineItems(slice, storeId);
    console.log(`  upserted ${Math.min(i + chunk, all.length)}/${all.length}`);
  }
}

async function main() {
  const days = Math.max(1, Number.parseInt(process.argv[2] ?? "365", 10) || 365);
  const storeArg = (process.argv[3] ?? "both").toLowerCase();

  if (storeArg === "1" || storeArg === "store1") {
    await backfillStore(days, 1);
  } else if (storeArg === "2" || storeArg === "store2") {
    await backfillStore(days, 2);
  } else {
    await backfillStore(days, 1);
    await backfillStore(days, 2);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
