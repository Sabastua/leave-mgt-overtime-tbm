-- =============================================================================
-- 0002_leave_management.sql
-- Complete setup for instant password login + Leave Management & Balances
-- Run this in the Supabase SQL Editor (safe to run multiple times).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. Allowlist + auto-confirm for the 4 authorised Safaricom users
-- -----------------------------------------------------------------------------
create table if not exists public.allowed_users (
  email      text primary key check (email = lower(email)),
  full_name  text not null default '',
  role       text not null default 'staff' check (role in ('approver', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.allowed_users
  add column if not exists full_name text not null default '',
  add column if not exists role text not null default 'staff';

alter table public.allowed_users enable row level security;

insert into public.allowed_users (email, full_name, role) values
  ('akiminda@safaricom.co.ke',   'A. Kiminda',         'approver'),
  ('brkimani@safaricom.co.ke',   'B. R. Kimani',       'approver'),
  ('smacharia6@safaricom.co.ke', 'Sabastian Macharia', 'approver'),
  ('skavoi@safaricom.co.ke',     'S. Kavoi',           'staff')
on conflict (email) do update
  set full_name = excluded.full_name,
      role      = excluded.role;

-- Allow authenticated users to read the team directory
drop policy if exists "Authenticated users can view allowed_users" on public.allowed_users;
create policy "Authenticated users can view allowed_users"
  on public.allowed_users for select
  to authenticated
  using (true);

grant select on public.allowed_users to authenticated;

-- Enforce allowlist AND auto-confirm email on signup so first-time password
-- setup logs the user in immediately without waiting for a confirmation email.
create or replace function public.enforce_auth_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or not exists (
       select 1 from public.allowed_users a where a.email = lower(new.email)
     ) then
    raise exception 'Email % is not authorised to sign up', new.email
      using errcode = '42501';
  end if;

  new.email := lower(new.email);
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_auth_allowlist on auth.users;
create trigger enforce_auth_allowlist
  before insert or update of email on auth.users
  for each row execute function public.enforce_auth_allowlist();

revoke execute on function public.enforce_auth_allowlist() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Helper RPC for first-time password setup when an OTP user already exists
--    without a password set in auth.users.
-- -----------------------------------------------------------------------------
create or replace function public.claim_initial_password(
  p_email text,
  p_password text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_user  auth.users%rowtype;
begin
  if length(coalesce(p_password, '')) < 6 then
    return 'weak_password';
  end if;

  if not exists (select 1 from public.allowed_users where email = v_email) then
    return 'not_allowed';
  end if;

  select * into v_user
  from auth.users
  where lower(email) = v_email
  limit 1;

  if not found then
    return 'no_user';
  end if;

  -- Only set password if the user does not already have one (e.g. created via OTP)
  if coalesce(v_user.encrypted_password, '') = '' then
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at         = now()
    where id = v_user.id;
    return 'password_set';
  end if;

  -- Ensure existing user's email is marked confirmed so password sign-in succeeds
  if v_user.email_confirmed_at is null then
    update auth.users
    set email_confirmed_at = now(),
        updated_at         = now()
    where id = v_user.id;
    return 'confirmed';
  end if;

  return 'has_password';
end;
$$;

grant execute on function public.claim_initial_password(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Leave Types & Entitlements
-- -----------------------------------------------------------------------------
create table if not exists public.leave_types (
  code        text primary key,
  name        text not null,
  annual_days integer not null check (annual_days >= 0),
  color       text not null default 'emerald',
  description text not null default '',
  sort_order  integer not null default 10
);

alter table public.leave_types enable row level security;

insert into public.leave_types (code, name, annual_days, color, description, sort_order) values
  ('annual',        'Annual Leave',        21, 'emerald', 'Standard paid annual vacation entitlement', 1),
  ('sick',          'Sick Leave',          14, 'amber',   'Medical & recovery leave',                 2),
  ('compassionate', 'Compassionate Leave',  5, 'purple',  'Bereavement or urgent family emergencies', 3),
  ('study',         'Study / Exam Leave',   5, 'blue',    'Professional exams and study days',        4)
on conflict (code) do update
  set name        = excluded.name,
      annual_days = excluded.annual_days,
      color       = excluded.color,
      description = excluded.description,
      sort_order  = excluded.sort_order;

drop policy if exists "Authenticated users can view leave_types" on public.leave_types;
create policy "Authenticated users can view leave_types"
  on public.leave_types for select
  to authenticated
  using (true);

grant select on public.leave_types to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Leave Requests
-- -----------------------------------------------------------------------------
create table if not exists public.leave_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  user_email      text not null check (user_email = lower(user_email)),
  leave_type      text not null references public.leave_types(code),
  start_date      date not null,
  end_date        date not null,
  working_days    integer not null check (working_days > 0),
  reason          text not null default '',
  handover_email  text references public.allowed_users(email),
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by     text references public.allowed_users(email),
  reviewed_at     timestamptz,
  reviewer_note   text,
  created_at      timestamptz not null default now(),
  constraint valid_date_range check (end_date >= start_date)
);

create index if not exists idx_leave_requests_user_email on public.leave_requests(user_email);
create index if not exists idx_leave_requests_status     on public.leave_requests(status);
create index if not exists idx_leave_requests_dates      on public.leave_requests(start_date, end_date);

alter table public.leave_requests enable row level security;

-- Helper: check if the current JWT belongs to an approver
create or replace function public.is_current_user_approver()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_users a
    where a.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and a.role = 'approver'
  );
$$;

-- Everyone on the team can view leave requests (supports team visibility & balances)
drop policy if exists "Team members can view all leave requests" on public.leave_requests;
create policy "Team members can view all leave requests"
  on public.leave_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.allowed_users a
      where a.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  );

-- Authenticated allow-listed users can create leave requests for themselves
drop policy if exists "Users can create their own leave requests" on public.leave_requests;
create policy "Users can create their own leave requests"
  on public.leave_requests for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and user_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and status = 'pending'
  );

-- Users can cancel their own pending requests; approvers can review any request
drop policy if exists "Users can cancel own pending or approvers can review" on public.leave_requests;
create policy "Users can cancel own pending or approvers can review"
  on public.leave_requests for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_current_user_approver()
  )
  with check (
    (
      (select auth.uid()) = user_id
      and status = 'cancelled'
    )
    or public.is_current_user_approver()
  );

grant select, insert, update on public.leave_requests to authenticated;
