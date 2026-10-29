-- =============================================================================
-- 0003_overtime_management.sql
-- Overtime tracking, task details, and approval workflow
-- =============================================================================

create table if not exists public.overtime_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  user_email      text not null check (user_email = lower(user_email)),
  overtime_date   date not null,
  hours           numeric(4, 2) not null check (hours > 0 and hours <= 24),
  task_summary    text not null,
  ticket_ref      text,
  compensatory_choice text not null default 'paid' check (compensatory_choice in ('paid', 'time_off_in_lieu')),
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by     text references public.allowed_users(email),
  reviewed_at     timestamptz,
  reviewer_note   text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_overtime_user_email on public.overtime_records(user_email);
create index if not exists idx_overtime_status     on public.overtime_records(status);
create index if not exists idx_overtime_date       on public.overtime_records(overtime_date);

alter table public.overtime_records enable row level security;

-- All team members can view overtime records
drop policy if exists "Team members can view overtime records" on public.overtime_records;
create policy "Team members can view overtime records"
  on public.overtime_records for select
  to authenticated
  using (
    exists (
      select 1 from public.allowed_users a
      where a.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  );

-- Users can submit overtime for themselves
drop policy if exists "Users can log their own overtime" on public.overtime_records;
create policy "Users can log their own overtime"
  on public.overtime_records for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and user_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and status = 'pending'
  );

-- Users can cancel own pending requests, approvers can review
drop policy if exists "Users can cancel own pending overtime or approvers can review" on public.overtime_records;
create policy "Users can cancel own pending overtime or approvers can review"
  on public.overtime_records for update
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

grant select, insert, update on public.overtime_records to authenticated;
