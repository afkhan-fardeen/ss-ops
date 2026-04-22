/**
 * One-shot cleanup: NULL out any tracking_url rows whose value doesn't contain
 * the tracking id itself. Ubex's details endpoint has at times returned a bare
 * `https://ubex.co/tracking/` without the id — we don't want to keep those.
 *
 * Run with: npx tsx scripts/purge-bad-tracking-urls.ts
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

  const { data, error } = await supabase
    .from("ubex_cache")
    .select("tracking, tracking_url");
  if (error) throw error;

  const bad = (data ?? []).filter(
    (r) => r.tracking_url && typeof r.tracking_url === "string" && !r.tracking_url.includes(r.tracking),
  );

  console.log(`Scanned ${data?.length ?? 0} rows. ${bad.length} have a URL without the tracking id.`);

  if (bad.length === 0) {
    console.log("Nothing to purge.");
    return;
  }

  const keys = bad.map((r) => r.tracking);
  const { error: updErr } = await supabase
    .from("ubex_cache")
    .update({ tracking_url: null, refreshed_at: new Date().toISOString() })
    .in("tracking", keys);
  if (updErr) throw updErr;

  console.log(`NULLed tracking_url on ${keys.length} row(s). Next page load will rebuild URLs from the template.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
