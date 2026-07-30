-- 011_profile_allowed_modules.sql
-- Adds per-user module access control.
-- null (default) = all modules visible (backwards compatible — all existing users unaffected).
-- e.g. '{"cod","awb"}' = only those two cards shown on the launcher.
-- Admins always see all modules regardless of this column (enforced in application code).

alter table profiles
  add column if not exists allowed_modules text[] default null;

comment on column profiles.allowed_modules is
  'Subset of module ids the user may access. null = unrestricted. Set by admins via the portal.';
