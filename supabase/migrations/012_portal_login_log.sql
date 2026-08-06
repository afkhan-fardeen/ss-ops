-- 012_portal_login_log.sql
-- Records successful Supabase staff logins for the admin activity panel.

create table if not exists portal_login_log (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  email text,
  logged_in_at timestamptz not null default now(),
  user_agent text,
  ip text
);

create index if not exists portal_login_log_user_id_idx on portal_login_log (user_id);
create index if not exists portal_login_log_logged_in_at_idx on portal_login_log (logged_in_at desc);

comment on table portal_login_log is
  'Successful portal logins (Supabase Auth users). Written by POST /api/auth/login-event.';
