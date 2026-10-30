-- =============================================================================
-- 0005_team_management_rls.sql
-- Allow approvers to manage team members directly from the application
-- =============================================================================

-- Add active status column if not already present
alter table public.allowed_users
  add column if not exists is_active boolean not null default true;

-- Ensure all existing members are active
update public.allowed_users set is_active = true where is_active is null;

-- Approver policy for INSERT (Adding new team members)
drop policy if exists "Approvers can insert allowed_users" on public.allowed_users;
create policy "Approvers can insert allowed_users"
  on public.allowed_users for insert
  to authenticated
  with check (
    public.is_current_user_approver()
  );

-- Approver policy for UPDATE (Editing name, role, active status)
drop policy if exists "Approvers can update allowed_users" on public.allowed_users;
create policy "Approvers can update allowed_users"
  on public.allowed_users for update
  to authenticated
  using (
    public.is_current_user_approver()
  )
  with check (
    public.is_current_user_approver()
  );

-- Approver policy for DELETE (Removing team members)
drop policy if exists "Approvers can delete allowed_users" on public.allowed_users;
create policy "Approvers can delete allowed_users"
  on public.allowed_users for delete
  to authenticated
  using (
    public.is_current_user_approver()
  );

grant insert, update, delete on public.allowed_users to authenticated;

-- Update enforce_auth_allowlist to require is_active = true
create or replace function public.enforce_auth_allowlist()
returns trigger
as $$
begin
  if new.email is null
     or not exists (
       select 1 from public.allowed_users a
       where a.email = lower(new.email) and a.is_active = true
     ) then
    raise exception 'Email % is not authorised or has been deactivated', new.email
      using errcode = '42501';
  end if;

  new.email := lower(new.email);
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = '';
