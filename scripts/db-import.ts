/**
 * Restore a backup (from `npm run db:export`) into a NEW Supabase project.
 *
 * 1. Create the new project, then apply the schema:   SUPABASE_DB_URL=<new db url> npm run db:push
 * 2. Restore the data:
 *      TARGET_SUPABASE_DB_URL=...  TARGET_SUPABASE_URL=...  TARGET_SUPABASE_SERVICE_ROLE_KEY=... \
 *        npm run db:import -- backups/<timestamp> --yes
 *
 * Safe to re-run (rows are upserted by primary key). Refuses to run against the project in your .env
 * unless that is also the target, and requires --yes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { hostOf, loadEnv, quoteIdent, requireEnv } from "./_db";

loadEnv(".env.local");
loadEnv(".env");

type Manifest = { sourceHost: string; tables: Record<string, number>; storage: Record<string, number> };

const BATCH = 500;

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

/** Order tables so every foreign-key parent is loaded before its children. */
async function orderTables(client: Client, names: string[]): Promise<string[]> {
  const { rows } = await client.query<{ child: string; parent: string }>(`
    select cn.nspname || '.' || cc.relname as child, pn.nspname || '.' || pc.relname as parent
    from pg_constraint c
    join pg_class cc on cc.oid = c.conrelid join pg_namespace cn on cn.oid = cc.relnamespace
    join pg_class pc on pc.oid = c.confrelid join pg_namespace pn on pn.oid = pc.relnamespace
    where c.contype = 'f'`);
  const set = new Set(names);
  const deps = new Map<string, Set<string>>(names.map((n) => [n, new Set()]));
  for (const { child, parent } of rows) {
    if (child !== parent && set.has(child) && set.has(parent)) deps.get(child)!.add(parent);
  }
  const ordered: string[] = [];
  const remaining = new Set(names);
  while (remaining.size) {
    const ready = [...remaining].filter((n) => [...deps.get(n)!].every((d) => !remaining.has(d)));
    if (ready.length === 0) throw new Error(`Foreign-key cycle among: ${[...remaining].join(", ")}`);
    for (const n of ready.sort()) {
      ordered.push(n);
      remaining.delete(n);
    }
  }
  return ordered;
}

async function importTable(client: Client, full: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const [schema, table] = full.split(".") as [string, string];
  const target = `${quoteIdent(schema)}.${quoteIdent(table)}`;

  const cols = await client.query<{ column_name: string; identity_generation: string | null }>(
    `select column_name, identity_generation from information_schema.columns
     where table_schema = $1 and table_name = $2 and is_generated = 'NEVER' order by ordinal_position`,
    [schema, table],
  );
  const present = new Set(Object.keys(rows[0]!));
  const usable = cols.rows.filter((c) => present.has(c.column_name));
  if (usable.length === 0) throw new Error(`${full}: no matching columns in target — is the schema applied?`);
  const colList = usable.map((c) => quoteIdent(c.column_name)).join(", ");
  const overriding = usable.some((c) => c.identity_generation === "ALWAYS") ? " overriding system value" : "";

  const pk = await client.query<{ attname: string }>(
    `select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
     where i.indrelid = $1::regclass and i.indisprimary`,
    [target],
  );
  const pkCols = pk.rows.map((r) => r.attname);
  const updatable = usable.filter((c) => !pkCols.includes(c.column_name));
  const conflict =
    pkCols.length === 0
      ? ""
      : updatable.length === 0
        ? ` on conflict (${pkCols.map(quoteIdent).join(", ")}) do nothing`
        : ` on conflict (${pkCols.map(quoteIdent).join(", ")}) do update set ${updatable
            .map((c) => `${quoteIdent(c.column_name)} = excluded.${quoteIdent(c.column_name)}`)
            .join(", ")}`;

  const sql = `insert into ${target} (${colList})${overriding}
    select ${colList} from json_populate_recordset(null::${target}, $1::json)${conflict}`;
  for (let i = 0; i < rows.length; i += BATCH) {
    await client.query(sql, [JSON.stringify(rows.slice(i, i + BATCH))]);
  }
}

async function resetSequences(client: Client, names: string[]) {
  for (const full of names) {
    const [schema, table] = full.split(".") as [string, string];
    const { rows } = await client.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = $1 and table_name = $2
       and (column_default like 'nextval(%' or is_identity = 'YES')`,
      [schema, table],
    );
    for (const { column_name } of rows) {
      const t = `${quoteIdent(schema)}.${quoteIdent(table)}`;
      await client.query(
        `select setval(pg_get_serial_sequence($1, $2), coalesce((select max(${quoteIdent(column_name)}) from ${t}), 1), (select count(*) > 0 from ${t}))`,
        [t, column_name],
      );
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir || !existsSync(join(dir, "manifest.json"))) {
    console.error("Usage: npm run db:import -- backups/<timestamp> --yes");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as Manifest;

  const dbUrl = requireEnv("TARGET_SUPABASE_DB_URL");
  const apiUrl = requireEnv("TARGET_SUPABASE_URL");
  const serviceKey = requireEnv("TARGET_SUPABASE_SERVICE_ROLE_KEY");

  if (hostOf(apiUrl) === manifest.sourceHost) {
    console.error(`Target (${hostOf(apiUrl)}) is the same project the backup came from. Refusing.`);
    process.exit(1);
  }
  console.log(`Backup from ${manifest.sourceHost} → restoring into ${hostOf(apiUrl)}`);
  for (const [t, n] of Object.entries(manifest.tables)) console.log(`  ${t.padEnd(36)} ${n} rows`);
  if (!args.includes("--yes")) {
    console.log("\nDry run. Re-run with --yes to write to the target.");
    return;
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const names = Object.keys(manifest.tables);
    const ordered = await orderTables(client, names);
    const existing = new Set(
      (await client.query<{ t: string }>(
        `select table_schema || '.' || table_name as t from information_schema.tables where table_type = 'BASE TABLE'`,
      )).rows.map((r) => r.t),
    );
    const skipped = ordered.filter((t) => !existing.has(t));
    if (skipped.length) console.log(`  (not in target schema, skipped: ${skipped.join(", ")})`);
    for (const full of ordered.filter((t) => existing.has(t))) {
      const rows = JSON.parse(readFileSync(join(dir, "tables", `${full}.json`), "utf8")) as Record<string, unknown>[];
      process.stdout.write(`  ${full.padEnd(36)} ${String(rows.length).padStart(7)} rows … `);
      await client.query("begin");
      try {
        await importTable(client, full, rows);
        await client.query("commit");
        console.log("ok");
      } catch (e) {
        await client.query("rollback");
        console.log("FAILED");
        throw e;
      }
    }
    const loaded = ordered.filter((t) => existing.has(t));
    await resetSequences(client, loaded);

    console.log("\nVerifying row counts…");
    let mismatches = 0;
    for (const full of loaded) {
      const [schema, table] = full.split(".") as [string, string];
      const { rows } = await client.query<{ n: string }>(`select count(*)::text as n from ${quoteIdent(schema)}.${quoteIdent(table)}`);
      const have = Number(rows[0]!.n);
      const want = manifest.tables[full]!;
      const ok = have >= want;
      if (!ok) mismatches++;
      console.log(`  ${ok ? "✓" : "✗"} ${full.padEnd(36)} backup ${want} / target ${have}`);
    }
    if (mismatches) throw new Error(`${mismatches} table(s) have fewer rows than the backup`);
  } finally {
    await client.end();
  }

  const storageDir = join(dir, "storage");
  if (existsSync(storageDir)) {
    console.log("\nRestoring Storage objects…");
    const supabase = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    for (const file of walkFiles(storageDir)) {
      const [bucket, ...rest] = relative(storageDir, file).split(/[\\/]/);
      const path = rest.join("/");
      const { error } = await supabase.storage.from(bucket!).upload(path, readFileSync(file), {
        upsert: true,
        contentType: path.endsWith(".pdf") ? "application/pdf" : undefined,
      });
      console.log(`  ${error ? "✗" : "✓"} ${bucket}/${path}${error ? ` — ${error.message}` : ""}`);
    }
  }
  console.log("\nDone. Point NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY / SUPABASE_DB_URL at the new project and redeploy.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
