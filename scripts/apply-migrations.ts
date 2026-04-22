/**
 * Apply every *.sql file under supabase/migrations/ against the target Postgres.
 * Usage:
 *   SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" \
 *     npx tsx scripts/apply-migrations.ts
 * Or:
 *   SUPABASE_DB_URL="postgresql://postgres.<ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres" \
 *     npx tsx scripts/apply-migrations.ts
 *
 * Each file is executed in a single transaction; migrations themselves are idempotent
 * (all DDL is `create table if not exists` / `drop policy if exists`), so re-running is safe.
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
      "SUPABASE_DB_URL is required. Grab the 'Connection string' from Supabase Dashboard → Project Settings → Database → Connection string → URI.",
    );
    process.exit(1);
  }

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
  console.log(`Connected. Applying ${files.length} migration file(s):`);

  try {
    for (const file of files) {
      const sql = readFileSync(join(dir, file), "utf8");
      const trimmed = sql.trim();
      if (!trimmed) {
        console.log(`  • ${file} — empty, skipping`);
        continue;
      }
      process.stdout.write(`  • ${file} … `);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("commit");
        console.log("ok");
      } catch (error) {
        await client.query("rollback");
        console.log("failed");
        console.error(error);
        process.exit(1);
      }
    }
    console.log("\nAll migrations applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
