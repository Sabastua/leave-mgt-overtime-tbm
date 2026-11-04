-- =============================================================================
-- 0009_repair_all_users_and_provisioning.sql
-- Universal fix for user provisioning, password resets, GoTrue scanner columns,
-- and repair for kkimaru@safaricom.co.ke and all existing users.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Function: admin_provision_user (Bulletproof GoTrue compliance)
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

  -- Validate caller authority
  if v_caller <> '' then
    if v_caller in ('fmbuthia@safaricom.co.ke', 'smacharia6@safaricom.co.ke') then
      v_is_approver := true;
    else
      select exists (
        select 1 from public.allowed_users
        where lower(email) = v_caller and role = 'approver' and is_active = true
      ) into v_is_approver;
    end if;

    if not v_is_approver then
      raise exception 'Unauthorized: Only approvers can add team members.';
    end if;
  end if;

  -- Upsert directory record
  insert into public.allowed_users (email, full_name, role, is_active)
  values (v_email, trim(p_full_name), p_role, true)
  on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      is_active = true;

  -- Check existing user in auth.users
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is not null then
    -- Update existing user ensuring all GoTrue string fields are not NULL
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change = coalesce(email_change, ''),
        email_change_token_current = coalesce(email_change_token_current, ''),
        reauthentication_token = coalesce(reauthentication_token, ''),
        is_sso_user = coalesce(is_sso_user, false),
        is_anonymous = coalesce(is_anonymous, false),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name)),
        updated_at = now()
    where id = v_user_id;
  else
    -- Create fresh user with all non-null GoTrue fields
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      null,
      '',
      null,
      '',
      null,
      '',
      '',
      null,
      null,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', trim(p_full_name)),
      false,
      now(),
      now(),
      null,
      null,
      '',
      '',
      null,
      '',
      0,
      null,
      '',
      null,
      false,
      null,
      false
    );
  end if;

  -- Ensure identity exists in auth.identities with native UUID id
  delete from auth.identities where user_id = v_user_id;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  return 'success';
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;

-- 2. Function: admin_reset_user_password (Bulletproof GoTrue compliance)
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
        where lower(email) = v_caller and role = 'approver' and is_active = true
      ) into v_is_approver;
    end if;

    if not v_is_approver then
      raise exception 'Unauthorized: Only approvers can reset passwords.';
    end if;
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is null then
    select full_name into v_full_name from public.allowed_users where lower(email) = v_email;
    return public.admin_provision_user(v_email, p_password, coalesce(v_full_name, split_part(v_email, '@', 1)), 'staff');
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change = coalesce(email_change, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      reauthentication_token = coalesce(reauthentication_token, ''),
      is_sso_user = coalesce(is_sso_user, false),
      is_anonymous = coalesce(is_anonymous, false),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at = now()
  where id = v_user_id;

  delete from auth.identities where user_id = v_user_id;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  return 'success';
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;

-- 3. Automatic Repair for all existing accounts (fixes NULL tokens and missing identities)
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    is_sso_user = coalesce(is_sso_user, false),
    is_anonymous = coalesce(is_anonymous, false),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb);

-- Insert missing auth.identities for any user in auth.users
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', lower(u.email)),
  'email',
  u.id::text,
  now(),
  now(),
  now()
from auth.users u
where not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
) and u.email is not null;

-- 4. Clean provision and repair specifically for kkimaru@safaricom.co.ke
do $$
declare
  v_email text := 'kkimaru@safaricom.co.ke';
  v_full_name text := 'K. Kimaru';
  v_password text := 'Safaricom2026!';
  v_user_id uuid;
begin
  -- Fetch existing user_id if present
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is not null then
    update auth.users
    set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        email_change_token_current = '',
        reauthentication_token = '',
        is_sso_user = false,
        is_anonymous = false,
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = jsonb_build_object('full_name', v_full_name),
        updated_at = now()
    where id = v_user_id;

    delete from auth.identities where user_id = v_user_id;

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
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
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      null,
      '',
      null,
      '',
      null,
      '',
      '',
      null,
      null,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      false,
      now(),
      now(),
      null,
      null,
      '',
      '',
      null,
      '',
      0,
      null,
      '',
      null,
      false,
      null,
      false
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  end if;

  -- Ensure record exists in public.allowed_users as staff
  insert into public.allowed_users (email, full_name, role, is_active)
  values (v_email, v_full_name, 'staff', true)
  on conflict (email) do update
  set full_name = v_full_name,
      role = 'staff',
      is_active = true;
end $$;
