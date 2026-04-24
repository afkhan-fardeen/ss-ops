/**
 * Ensures the `cod_settings` table exists in Supabase.
 * Runs DDL via direct Postgres connection (SUPABASE_DB_URL).
 * Safe to call on every cold start — uses CREATE TABLE IF NOT EXISTS.
 */

let migrated = false;

export async function ensureCodSettings(): Promise<void> {
  if (migrated) return;

  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.warn("[ensureCodSettings] SUPABASE_DB_URL not set — skipping auto-migration");
    return;
  }

  try {
    // Dynamic import so pg is only loaded server-side
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS cod_settings (
        key        text PRIMARY KEY,
        value      text NOT NULL DEFAULT '',
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Enable RLS (idempotent)
    await client.query(`ALTER TABLE cod_settings ENABLE ROW LEVEL SECURITY;`);

    // Policy — only service_role can read/write (idempotent via DO block)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'cod_settings' AND policyname = 'service_role_all'
        ) THEN
          CREATE POLICY service_role_all ON cod_settings
            FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `);

    // Seed default row
    await client.query(`
      INSERT INTO cod_settings (key, value)
      VALUES ('email_recipients', '')
      ON CONFLICT (key) DO NOTHING;
    `);

    await client.end();
    migrated = true;
  } catch (err) {
    console.error("[ensureCodSettings] Migration failed:", err);
  }
}
