# Database runbook (Supabase)

The portal uses one Supabase project: Postgres (all `public.*` tables), Auth (staff logins) and Storage (bucket `subscription-pdfs`).

## Connection strings
Use the **Session pooler** URI (Supabase → Connect). The direct `db.<ref>.supabase.co` host is IPv6-only and fails on most home/office networks.
`SUPABASE_DB_URL` is only used by the `db:*` scripts — the running app uses the HTTP keys (`NEXT_PUBLIC_SUPABASE_URL`, anon key, service role key).

## Day to day
| Command | What it does |
|---|---|
| `npm run db:push` | Applies pending files in `supabase/migrations/` (each runs once; tracked in `public.schema_migrations`). |
| `npm run db:baseline` | One-off: marks all current migrations as applied without running them (for a DB set up before tracking). |
| `npm run db:bundle` | Regenerates `supabase/setup.sql` — the whole schema in one file, for pasting into the SQL editor of a new project. |
| `npm run db:export` | Full backup to `backups/<timestamp>/` (every public table, `auth.users`/`auth.identities` with password hashes, Storage files). Read-only. |
| `npm run db:import -- backups/<ts> --yes` | Restores a backup into another project (see below). |
| `npm run db:verify` | Quick connectivity/row-count check of key tables. |

To add a schema change: create `supabase/migrations/0NN_name.sql` (write it so a retry can't half-apply), run `npm run db:push`, then `npm run db:bundle`.

## Moving to a new Supabase project
1. Create the project (new region/org is fine). Note its **URL, anon key, service role key and Session pooler URI**.
2. Schema: `SUPABASE_DB_URL=<new pooler uri> npm run db:push`  (or paste `supabase/setup.sql` into the SQL editor).
3. Fresh backup of the old project: `npm run db:export`.
4. Restore:
   ```
   TARGET_SUPABASE_DB_URL=<new pooler uri> \
   TARGET_SUPABASE_URL=https://<new-ref>.supabase.co \
   TARGET_SUPABASE_SERVICE_ROLE_KEY=<new service role key> \
   npm run db:import -- backups/<timestamp> --yes
   ```
   Re-runnable (upserts by primary key), keeps user ids and password hashes (staff keep their passwords), restores the subscription PDFs, resets sequences and checks row counts. Tables that don't exist in the new schema are skipped.
5. Update `.env` and Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`. Redeploy.
6. In the new project: Authentication → URL Configuration → Site URL `https://ops.seissense.com`; Redirect URLs: `https://ops.seissense.com/api/auth/callback` (add `http://localhost:3000/api/auth/callback` for local dev). Authentication → Sign In / Providers → turn OFF "Allow new users to sign up". Re-register Shopify webhooks only if the portal URL changed.

## Known notes
- `public.ubex_inventory_cache` exists in the original project but has no migration and no code uses it; it is in backups but not recreated by the schema.
- `cod_list_day_cache` (migration 008) and the COD tables are legacy; the COD module was removed.
- Backups contain staff emails, password hashes and subscription PII. They are gitignored (`/backups/`) — keep them off shared drives.
