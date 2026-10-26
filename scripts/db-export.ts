/**
 * Full backup of the current Supabase project to ./backups/<timestamp>/ (gitignored).
 *   - every table in `public`, plus auth.users and auth.identities (so logins/passwords can be restored)
 *   - every Storage object (subscription PDFs)
 * Read-only: nothing in the source database is modified.
 *
 * Usage: npm run db:export
 * Needs SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { hostOf, loadEnv, quoteIdent, requireEnv, TABLES_SQL } from "./_db";

loadEnv(".env.local");
loadEnv(".env");

async function exportStorage(root: string, url: string, serviceKey: string) {
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const counts: Record<string, number> = {};

  async function walk(bucket: string, prefix: string) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error: listErr } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
      if (listErr) throw listErr;
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id === null) {
          await walk(bucket, path); // folder
          continue;
        }
        const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
        if (dlErr || !blob) throw new Error(`download ${bucket}/${path}: ${dlErr?.message}`);
        const file = join(root, "storage", bucket, path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, Buffer.from(await blob.arrayBuffer()));
        counts[bucket] = (counts[bucket] ?? 0) + 1;
      }
      if (data.length < 1000) break;
    }
  }

  for (const b of buckets ?? []) {
    counts[b.name] = counts[b.name] ?? 0;
    await walk(b.name, "");
  }
  return counts;
}

async function main() {
  const dbUrl = requireEnv("SUPABASE_DB_URL");
  const apiUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const root = join("backups", stamp);
  mkdirSync(join(root, "tables"), { recursive: true });

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const tables: Record<string, number> = {};
  try {
    const { rows } = await client.query<{ table_schema: string; table_name: string }>(TABLES_SQL);
    for (const { table_schema, table_name } of rows) {
      const full = `${table_schema}.${table_name}`;
      const res = await client.query<{ j: unknown[] }>(
        `select coalesce(json_agg(t), '[]'::json) as j from (select * from ${quoteIdent(table_schema)}.${quoteIdent(table_name)}) t`,
      );
      const data = res.rows[0]!.j;
      writeFileSync(join(root, "tables", `${full}.json`), JSON.stringify(data));
      tables[full] = data.length;
      console.log(`  ✓ ${full.padEnd(36)} ${String(data.length).padStart(7)} rows`);
    }
  } finally {
    await client.end();
  }

  console.log("Storage:");
  const storage = await exportStorage(root, apiUrl, serviceKey);
  for (const [bucket, n] of Object.entries(storage)) console.log(`  ✓ ${bucket.padEnd(36)} ${String(n).padStart(7)} files`);

  writeFileSync(
    join(root, "manifest.json"),
    JSON.stringify({ createdAt: new Date().toISOString(), sourceHost: hostOf(apiUrl), tables, storage }, null, 2),
  );
  console.log(`\nBackup written to ${root}`);
  console.log("It contains user emails and password hashes — keep it private (it is gitignored).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
