/**
 * Quick sanity-check: confirm every Phase-B/C/D table exists and is reachable via the service role.
 * Usage: npx tsx scripts/verify-supabase.ts
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tables = [
    "fulfillment_log",
    "fx_rate_snapshot",
    "ubex_cache",
    "push_idempotency",
    "fx_rates_cache",
    "profiles",
    "shopify_orders_cache",
  ];

  for (const name of tables) {
    const { error, count } = await client
      .from(name)
      .select("*", { count: "exact", head: true });
    if (error) {
      console.log(`  ✗ ${name.padEnd(24)} — ${error.message}`);
    } else {
      console.log(`  ✓ ${name.padEnd(24)} — ${count ?? 0} rows`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
