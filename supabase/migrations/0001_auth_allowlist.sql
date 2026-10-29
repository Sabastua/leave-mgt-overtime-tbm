-- =============================================================================
-- Auth allowlist: only these emails can ever be created as Supabase users.
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Keep in sync with src/lib/auth/allowed-users.ts
-- =============================================================================

create table if not exists public.allowed_users (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.allowed_users enable row level security;
-- No policies => not readable/writable through the public API.
-- Manage the list from the SQL editor / service role only.

insert into public.allowed_users (email) values
  ('akiminda@safaricom.co.ke'),
  ('brkimani@safaricom.co.ke'),
  ('skavoi@safaricom.co.ke'),
  ('smacharia6@safaricom.co.ke')
on conflict (email) do nothing;

-- Block creation of any auth user whose email is not on the allowlist.
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
  return new;
end;
$$;

drop trigger if exists enforce_auth_allowlist on auth.users;
create trigger enforce_auth_allowlist
  before insert or update of email on auth.users
  for each row execute function public.enforce_auth_allowlist();
