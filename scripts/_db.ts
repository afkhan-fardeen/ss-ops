/** Shared helpers for the database scripts (export / import / bundle). */
import { readFileSync } from "node:fs";

export function loadEnv(path: string) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* no env file — fine */
  }
}

export function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

export const quoteIdent = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Tables that make up an exportable Supabase project: everything in public + the auth users/identities. */
export const TABLES_SQL = `
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and (table_schema = 'public' or (table_schema = 'auth' and table_name in ('users', 'identities')))
  order by table_schema, table_name`;

export function hostOf(urlLike: string): string {
  try {
    return new URL(urlLike).host;
  } catch {
    return urlLike;
  }
}
