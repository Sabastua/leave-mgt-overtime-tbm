-- =============================================================================
-- 0007_manager_fmbuthia.sql
-- Configure fmbuthia@safaricom.co.ke as Manager and sole primary Approver
-- =============================================================================

-- 1. Insert or update fmbuthia@safaricom.co.ke in allowed_users as approver
insert into public.allowed_users (email, full_name, role, is_active)
values ('fmbuthia@safaricom.co.ke', 'F. Mbuthia', 'approver', true)
on conflict (email) do update
set role = 'approver',
    is_active = true,
    full_name = coalesce(nullif(public.allowed_users.full_name, ''), 'F. Mbuthia');

-- 2. Update other members to staff (except Macharia who remains admin/approver)
update public.allowed_users
set role = 'staff'
where email in ('akiminda@safaricom.co.ke', 'brkimani@safaricom.co.ke', 'skavoi@safaricom.co.ke');

-- 3. Update admin_provision_user and admin_reset_user_password checks to recognize fmbuthia
create or replace function public.admin_provision_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text default 'staff'
)
returns text
as $$
declare
  v_email text := lower(trim(p_email));
  v_user_id uuid;
  v_caller text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_is_approver boolean := false;
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  if v_email not like '%@safaricom.co.ke' then
    raise exception 'Email must end with @safaricom.co.ke';
  end if;

  if p_role not in ('staff', 'approver') then
    raise exception 'Role must be either staff or approver';
  end if;

  -- Validate that caller is an authorized approver (fmbuthia or database approver)
  if v_caller <> '' then
    if v_caller in ('fmbuthia@safaricom.co.ke', 'smacharia6@safaricom.co.ke') then
      v_is_approver := true;
    else
      select exists (
        select 1 from public.allowed_users
        where email = v_caller and role = 'approver' and is_active = true
      ) into v_is_approver;
    end if;

    if not v_is_approver then
      raise exception 'Unauthorized: Only approvers can add team members.';
    end if;
  end if;

  -- Insert or update allowed_users directory
  insert into public.allowed_users (email, full_name, role, is_active)
  values (v_email, trim(p_full_name), p_role, true)
  on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      is_active = true;

  -- Provision credentials in auth.users
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is not null then
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name)),
        updated_at = now()
    where id = v_user_id;
  else
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', trim(p_full_name)),
      now(),
      now()
    );
  end if;

  return 'success';
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;

-- Update password reset function
create or replace function public.admin_reset_user_password(
  p_email text,
  p_password text
)
returns text
as $$
declare
  v_email text := lower(trim(p_email));
  v_user_id uuid;
  v_full_name text;
  v_caller text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_is_approver boolean := false;
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  if v_caller <> '' then
    if v_caller in ('fmbuthia@safaricom.co.ke', 'smacharia6@safaricom.co.ke') then
      v_is_approver := true;
    else
      select exists (
        select 1 from public.allowed_users
        where email = v_caller and role = 'approver' and is_active = true
      ) into v_is_approver;
    end if;

    if not v_is_approver then
      raise exception 'Unauthorized: Only approvers can reset passwords.';
    end if;
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is null then
    select full_name into v_full_name from public.allowed_users where email = v_email;
    return public.admin_provision_user(v_email, p_password, coalesce(v_full_name, split_part(v_email, '@', 1)), 'staff');
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = v_user_id;

  return 'success';
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;
