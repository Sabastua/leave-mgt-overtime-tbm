-- =============================================================================
-- 0008_fix_auth_identities_and_fmbuthia.sql
-- Fix GoTrue "Database error querying schema" by ensuring auth.identities exists
-- and provision fmbuthia@safaricom.co.ke properly as Manager & Approver
-- =============================================================================

-- Ensure pgcrypto extension is active
create extension if not exists pgcrypto with schema extensions;

-- 1. Self-healing function to sync missing identities in auth.identities
create or replace function public.sync_missing_identities()
returns void
as $$
declare
  r record;
begin
  for r in (
    select u.id, u.email
    from auth.users u
    left join auth.identities i on i.user_id = u.id and i.provider = 'email'
    where i.id is null and u.email is not null
  ) loop
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
      r.id::text,
      r.id,
      jsonb_build_object('sub', r.id::text, 'email', lower(r.email)),
      'email',
      r.id::text,
      now(),
      now(),
      now()
    ) on conflict do nothing;
  end loop;
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;

-- 2. Cleanly provision or reset fmbuthia@safaricom.co.ke
do $$
declare
  v_email text := 'fmbuthia@safaricom.co.ke';
  v_full_name text := 'F. Mbuthia';
  v_initial_password text := 'Safaricom2026!'; -- Default initial password
  v_user_id uuid;
begin
  -- Check if user already exists in auth.users
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is not null then
    -- Update password and confirmation
    update auth.users
    set encrypted_password = extensions.crypt(v_initial_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = jsonb_build_object('full_name', v_full_name),
        updated_at = now()
    where id = v_user_id;

    -- Ensure identity exists
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
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    ) on conflict (provider, id) do update
    set identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_email),
        updated_at = now();
  else
    -- Create fresh user
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
      extensions.crypt(v_initial_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      now(),
      now()
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
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  end if;

  -- Ensure entry in public.allowed_users as approver
  insert into public.allowed_users (email, full_name, role, is_active)
  values (v_email, v_full_name, 'approver', true)
  on conflict (email) do update
  set role = 'approver',
      full_name = v_full_name,
      is_active = true;
end $$;

-- 3. Run identity sync to clean any other test accounts
select public.sync_missing_identities();

-- 4. Update admin_provision_user to ALWAYS insert into auth.identities
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

  -- Check caller authority if JWT exists
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

  -- Insert/update allowed_users
  insert into public.allowed_users (email, full_name, role, is_active)
  values (v_email, trim(p_full_name), p_role, true)
  on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      is_active = true;

  -- Look up existing user in auth.users
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is not null then
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
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
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', trim(p_full_name)),
      now(),
      now()
    );
  end if;

  -- CRITICAL: Insert/update identity in auth.identities
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
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  ) on conflict (provider, id) do update
  set identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      updated_at = now();

  return 'success';
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;

-- 5. Update admin_reset_user_password to also update/create identity
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
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at = now()
  where id = v_user_id;

  -- Ensure identity exists in auth.identities
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
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  ) on conflict (provider, id) do update
  set identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      updated_at = now();

  return 'success';
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;
