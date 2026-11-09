-- ============================================================================
-- Migration 0011: Team Operational Settings & Minimum Staffing SLA Guard
-- Description:
--   Supports Step 3 (Forward Coverage & Minimum Staffing Risk Radar).
--   Configures minimum on-duty staffing levels, SLA capacity thresholds,
--   forward scan window (30-60 days), and handover clash safeguards.
-- ============================================================================

-- 1. Create team_operational_settings table
create table if not exists public.team_operational_settings (
    id uuid primary key default gen_random_uuid(),
    setting_key text unique not null default 'default_ops',
    min_on_duty_staff integer not null default 2,
    min_capacity_percent integer not null default 70,
    alert_window_days integer not null default 60,
    notify_double_handover boolean not null default true,
    updated_by text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint team_ops_min_staff_positive check (min_on_duty_staff >= 1),
    constraint team_ops_min_capacity_range check (min_capacity_percent between 1 and 100),
    constraint team_ops_alert_window_range check (alert_window_days between 14 and 180)
);

-- 2. Seed initial operational configuration
insert into public.team_operational_settings (
    setting_key,
    min_on_duty_staff,
    min_capacity_percent,
    alert_window_days,
    notify_double_handover,
    updated_by
)
values (
    'default_ops',
    2,
    70,
    60,
    true,
    'fmbuthia@safaricom.co.ke'
)
on conflict (setting_key) do update
set
    min_on_duty_staff = excluded.min_on_duty_staff,
    min_capacity_percent = excluded.min_capacity_percent,
    alert_window_days = excluded.alert_window_days,
    notify_double_handover = excluded.notify_double_handover,
    updated_at = timezone('utc'::text, now());

-- 3. Enable Row Level Security
alter table public.team_operational_settings enable row level security;

-- 4. RLS Policies
drop policy if exists "Authenticated users view operational settings" on public.team_operational_settings;
create policy "Authenticated users view operational settings"
    on public.team_operational_settings
    for select
    to authenticated
    using (true);

drop policy if exists "Approvers manage operational settings" on public.team_operational_settings;
create policy "Approvers manage operational settings"
    on public.team_operational_settings
    for all
    to authenticated
    using (
        exists (
            select 1 from public.allowed_users au
            where lower(au.email) = lower(auth.jwt() ->> 'email')
              and au.role = 'approver'
        )
        or lower(auth.jwt() ->> 'email') = 'fmbuthia@safaricom.co.ke'
    )
    with check (
        exists (
            select 1 from public.allowed_users au
            where lower(au.email) = lower(auth.jwt() ->> 'email')
              and au.role = 'approver'
        )
        or lower(auth.jwt() ->> 'email') = 'fmbuthia@safaricom.co.ke'
    );

-- 5. Grants
grant select on public.team_operational_settings to authenticated;
grant all on public.team_operational_settings to service_role;

comment on table public.team_operational_settings is 'Stores team minimum staffing levels and coverage SLA parameters';
