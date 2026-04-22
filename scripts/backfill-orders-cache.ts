/**
 * One-shot backfill of `shopify_orders_cache` from the Shopify Admin API.
 *
 * Run with:
 *   npx tsx scripts/backfill-orders-cache.ts [days]
 *
 * Defaults to the last 30 days. Reads env from .env.local / .env.
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

async function main() {
  // After env is loaded, dynamic-import the project code so getSupabaseService() sees the keys.
  const { fetchOrders } = await import("@/lib/orders/fetch-orders");
  const { upsertOrdersCache } = await import("@/lib/supabase/orders-cache");
  const { getSupabaseService } = await import("@/lib/supabase/service");

  if (!getSupabaseService()) {
    console.error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const days = Math.max(1, Number.parseInt(process.argv[2] ?? "30", 10) || 30);
  const max = new Date();
  const min = new Date(Date.now() - days * 86400000);

  console.log(`Backfilling orders from ${min.toISOString()} → ${max.toISOString()} (${days} day window)…`);

  const { orders } = await fetchOrders({
    createdAtMinIso: min.toISOString(),
    createdAtMaxIso: max.toISOString(),
    cacheStrategy: "live",
  });

  console.log(`Fetched ${orders.length} orders from Shopify. Upserting into shopify_orders_cache…`);

  // Chunk to avoid Supabase's 1 MB row limit.
  const chunk = 500;
  for (let i = 0; i < orders.length; i += chunk) {
    const slice = orders.slice(i, i + chunk);
    await upsertOrdersCache(slice);
    console.log(`  upserted ${i + slice.length}/${orders.length}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
