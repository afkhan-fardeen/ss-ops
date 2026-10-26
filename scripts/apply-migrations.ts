/**
 * Apply pending *.sql files under supabase/migrations/ against the target Postgres (each runs once;
 * applied files are tracked in public.schema_migrations). `--baseline` marks all current files as applied
 * without running them — use it once on a database that predates tracking.
 * Usage:
 *   SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" \
 *     npx tsx scripts/apply-migrations.ts
 * Or:
 *   SUPABASE_DB_URL="postgresql://postgres.<ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres" \
 *     npx tsx scripts/apply-migrations.ts
 *
 * Each file is executed in a single transaction together with its tracking row.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

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
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error(
      "SUPABASE_DB_URL is required. Use the Session pooler URI from Supabase Dashboard → Connect (the direct db.<ref>.supabase.co host is IPv6-only).",
    );
    process.exit(1);
  }
  const baseline = process.argv.includes("--baseline");

  const dir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error(`No .sql files found in ${dir}`);
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Connecting to Postgres…`);
  await client.connect();

  // Each migration runs exactly once; applied files are recorded here.
  await client.query(`create table if not exists public.schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  await client.query(`alter table public.schema_migrations enable row level security`);
  const done = new Set(
    (await client.query<{ name: string }>("select name from public.schema_migrations")).rows.map((r) => r.name),
  );

  try {
    if (baseline) {
      // Mark every migration as already applied WITHOUT running it (for a database that was set up before tracking existed).
      for (const file of files) {
        await client.query("insert into public.schema_migrations (name) values ($1) on conflict do nothing", [file]);
      }
      console.log(`Baselined ${files.length} migration(s) as applied.`);
      return;
    }

    const pending = files.filter((f) => !done.has(f));
    console.log(`${done.size} already applied, ${pending.length} pending.`);
    for (const file of pending) {
      const sql = readFileSync(join(dir, file), "utf8");
      process.stdout.write(`  • ${file} … `);
      await client.query("begin");
      try {
        if (sql.trim()) await client.query(sql);
        await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log("ok");
      } catch (error) {
        await client.query("rollback");
        console.log("failed");
        console.error(error);
        process.exit(1);
      }
    }
    console.log(pending.length ? "\nAll pending migrations applied." : "\nDatabase is up to date.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
