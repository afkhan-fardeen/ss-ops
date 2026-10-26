-- 022_signup_no_default_access.sql
-- Security: a profile auto-created for a NEW auth user must start with NO module access.
-- Previously allowed_modules defaulted to NULL, which the app treats as "default members' access"
-- (Fulfillment + AWB). Combined with public sign-up being enabled in Supabase Auth, anyone holding the
-- (public) anon key could create an account and get that access.
-- Admin-created users are unaffected: createPortalUser() sets allowed_modules explicitly right after creation.
-- Existing profiles are not touched.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, allowed_modules)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), '{}'::text[])
  on conflict (id) do nothing;
  return new;
end;
$$;
