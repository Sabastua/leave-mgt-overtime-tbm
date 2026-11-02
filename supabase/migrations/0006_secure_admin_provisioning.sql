-- =============================================================================
-- 0006_secure_admin_provisioning.sql
-- Secure admin-only user provisioning and password management
-- Eliminates public password claiming and external email rate limits
-- =============================================================================

-- 1. Admin Provision User (creates or updates allowed_users and auth.users)
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
  v_caller text := lower(auth.jwt() ->> 'email');
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

  -- Verify caller is an approver
  if v_caller is not null then
    select exists (
      select 1 from public.allowed_users
      where email = v_caller and role = 'approver' and is_active = true
    ) into v_is_approver;

    if not v_is_approver and v_caller in (
      'smacharia6@safaricom.co.ke',
      'akiminda@safaricom.co.ke',
      'brkimani@safaricom.co.ke'
    ) then
      v_is_approver := true;
    end if;

    if not v_is_approver then
      raise exception 'Unauthorized: Only approvers can add team members.';
    end if;
  end if;

  -- 1. Insert or update in allowed_users
  insert into public.allowed_users (email, full_name, role, is_active)
  values (v_email, trim(p_full_name), p_role, true)
  on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      is_active = true;

  -- 2. Provision in auth.users
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is not null then
    -- Existing user: set new password and confirm email
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name)),
        updated_at = now()
    where id = v_user_id;
  else
    -- New user: create auth account directly
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
$$ language plpgsql security definer set search_path = '';

grant execute on function public.admin_provision_user(text, text, text, text) to authenticated;

-- 2. Admin Reset User Password
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
  v_caller text := lower(auth.jwt() ->> 'email');
  v_is_approver boolean := false;
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  -- Verify caller is an approver
  if v_caller is not null then
    select exists (
      select 1 from public.allowed_users
      where email = v_caller and role = 'approver' and is_active = true
    ) into v_is_approver;

    if not v_is_approver and v_caller in (
      'smacharia6@safaricom.co.ke',
      'akiminda@safaricom.co.ke',
      'brkimani@safaricom.co.ke'
    ) then
      v_is_approver := true;
    end if;

    if not v_is_approver then
      raise exception 'Unauthorized: Only approvers can reset passwords.';
    end if;
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if v_user_id is null then
    -- If user is in allowed_users but not yet in auth.users, create their auth account
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
$$ language plpgsql security definer set search_path = '';

grant execute on function public.admin_reset_user_password(text, text) to authenticated;

-- Revoke public claim_initial_password to prevent unauthorized password overwriting
revoke execute on function public.claim_initial_password(text, text) from anon;
