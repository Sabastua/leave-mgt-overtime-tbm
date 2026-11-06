-- ============================================================================
-- Migration 0010: Leave Carry-Forward Policy and Override Management
-- Description:
--   Supports policy where unutilized leave days from prior calendar years
--   are carried forward into subsequent years.
--   Provides table `leave_carry_forwards` for managerial adjustments,
--   overrides, and audit trails.
-- ============================================================================

-- 1. Create leave_carry_forwards table
create table if not exists public.leave_carry_forwards (
    id uuid primary key default gen_random_uuid(),
    user_email text not null,
    leave_type text not null default 'annual',
    year integer not null,
    carried_days numeric(4, 1) not null default 0,
    reason text,
    created_by text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint leave_carry_forwards_user_type_year_key unique (user_email, leave_type, year),
    constraint leave_carry_forwards_carried_positive check (carried_days >= 0)
);

create index if not exists idx_leave_carry_forwards_user_year
    on public.leave_carry_forwards (user_email, year);

-- 2. Enable Row Level Security
alter table public.leave_carry_forwards enable row level security;

-- 3. RLS Policies
drop policy if exists "Users view own carry forward" on public.leave_carry_forwards;
create policy "Users view own carry forward"
    on public.leave_carry_forwards
    for select
    to authenticated
    using (
        lower(user_email) = lower(auth.jwt() ->> 'email')
        or exists (
            select 1 from public.allowed_users au
            where lower(au.email) = lower(auth.jwt() ->> 'email')
              and au.role = 'approver'
        )
        or lower(auth.jwt() ->> 'email') = 'fmbuthia@safaricom.co.ke'
    );

drop policy if exists "Approvers manage carry forward" on public.leave_carry_forwards;
create policy "Approvers manage carry forward"
    on public.leave_carry_forwards
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

-- 4. Grants for authenticated and service_role
grant select, insert, update, delete on public.leave_carry_forwards to authenticated;
grant all on public.leave_carry_forwards to service_role;

-- 5. Audit View: Unspent Leave Balance and Rollover Estimation
create or replace view public.view_leave_carry_forward_summary as
with user_prior_years_approved as (
    select
        lr.user_email,
        lr.leave_type,
        extract(year from lr.start_date::date)::integer as leave_year,
        coalesce(sum(lr.working_days), 0) as approved_days
    from public.leave_requests lr
    where lr.status = 'approved'
      and extract(year from lr.start_date::date) < extract(year from current_date)
    group by lr.user_email, lr.leave_type, extract(year from lr.start_date::date)
),
user_auto_carried as (
    select
        pya.user_email,
        pya.leave_type,
        sum(greatest(0, lt.annual_days - pya.approved_days)) as total_auto_carried
    from user_prior_years_approved pya
    join public.leave_types lt on lt.code = pya.leave_type
    group by pya.user_email, pya.leave_type
)
select
    au.email as user_email,
    au.full_name,
    lt.code as leave_type,
    lt.annual_days as base_entitlement,
    coalesce(uac.total_auto_carried, 0) as calculated_carried_days,
    lcf.carried_days as manual_override_days,
    coalesce(lcf.carried_days, coalesce(uac.total_auto_carried, 0)) as effective_carried_days,
    lt.annual_days + coalesce(lcf.carried_days, coalesce(uac.total_auto_carried, 0)) as total_available_entitlement
from public.allowed_users au
cross join public.leave_types lt
left join user_auto_carried uac
    on lower(uac.user_email) = lower(au.email)
    and uac.leave_type = lt.code
left join public.leave_carry_forwards lcf
    on lower(lcf.user_email) = lower(au.email)
    and lcf.leave_type = lt.code
    and lcf.year = extract(year from current_date)::integer
where au.is_active = true;

grant select on public.view_leave_carry_forward_summary to authenticated;
grant select on public.view_leave_carry_forward_summary to service_role;

comment on table public.leave_carry_forwards is 'Stores carried forward leave days and manager adjustments across calendar years';
comment on view public.view_leave_carry_forward_summary is 'Computes unutilized leave days from prior years for carry-forward tracking';
