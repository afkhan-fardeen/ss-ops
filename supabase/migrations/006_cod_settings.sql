-- cod_settings: key-value store for COD feature configuration.
-- Currently used for the email recipients list.
create table if not exists cod_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table cod_settings enable row level security;

create policy "service_role_all" on cod_settings
  for all to service_role using (true) with check (true);

-- Seed default recipients placeholder (empty — admin fills in)
insert into cod_settings (key, value)
values ('email_recipients', '')
on conflict (key) do nothing;
