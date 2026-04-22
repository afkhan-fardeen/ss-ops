/**
 * Delete push_idempotency rows whose matching fulfillment_log entry is an error
 * (or whose log row is missing entirely). After the retry-on-error fix in
 * lib/shopify/fulfill-order.ts this shouldn't accumulate anymore, but running
 * this once unblocks any rows that got stuck before the fix landed.
 *
 * Run with: npx tsx scripts/clear-stuck-idempotency.ts
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: idemRows, error: idemErr } = await supabase
    .from("push_idempotency")
    .select("key, shopify_order_id, created_at");
  if (idemErr) throw idemErr;

  const { data: successLogs, error: logErr } = await supabase
    .from("fulfillment_log")
    .select("shopify_order_id, status")
    .eq("status", "success");
  if (logErr) throw logErr;

  const succeededOrders = new Set((successLogs ?? []).map((r) => r.shopify_order_id));
  const stuck = (idemRows ?? []).filter((r) => !succeededOrders.has(r.shopify_order_id));

  console.log(
    `Found ${idemRows?.length ?? 0} idempotency row(s); ${stuck.length} look stuck (no matching success log).`,
  );

  if (stuck.length === 0) {
    console.log("Nothing to clear.");
    return;
  }

  const keys = stuck.map((r) => r.key);
  const { error: delErr } = await supabase.from("push_idempotency").delete().in("key", keys);
  if (delErr) throw delErr;

  console.log(`Deleted ${keys.length} stuck row(s). You can retry the Push now.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
