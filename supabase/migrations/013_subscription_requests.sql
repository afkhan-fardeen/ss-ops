-- 013_subscription_requests.sql
-- Public subscription request form + admin approval workflow.

create sequence if not exists subscription_reference_seq start 1;

create table if not exists subscription_requests (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),

  employee_name text not null,
  employee_email text not null,
  department text,
  job_title text,

  subscription_name text not null,
  vendor text,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly', 'one_time', 'other')),
  billing_cycle_other text,
  entity_billed text,
  payment_method text,
  start_date date,
  justification text,
  notes text,

  approved_by uuid references profiles(id) on delete set null,
  approved_by_name text,
  approved_at timestamptz,
  rejected_by uuid references profiles(id) on delete set null,
  rejected_by_name text,
  rejected_at timestamptz,
  rejection_reason text,

  pdf_storage_path text,
  pdf_generated_at timestamptz
);

create index if not exists subscription_requests_status_idx on subscription_requests (status);
create index if not exists subscription_requests_created_idx on subscription_requests (created_at desc);
create index if not exists subscription_requests_email_idx on subscription_requests (employee_email);
create index if not exists subscription_requests_ref_idx on subscription_requests (reference_number);

comment on table subscription_requests is
  'Employee subscription requests submitted via public form; admin approves after signed PDF.';

-- Supabase Storage bucket for generated PDFs (private; server uses service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'subscription-pdfs',
  'subscription-pdfs',
  false,
  5242880,
  array['application/pdf']::text[]
)
on conflict (id) do nothing;
