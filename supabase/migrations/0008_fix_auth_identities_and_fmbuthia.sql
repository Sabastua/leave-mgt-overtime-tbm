-- =============================================================================
-- 0008_fix_auth_identities_and_fmbuthia.sql
-- Fix GoTrue user schema requirements and cleanly provision fmbuthia@safaricom.co.ke
-- =============================================================================

-- Ensure pgcrypto extension is active
create extension if not exists pgcrypto with schema extensions;

-- 1. Cleanly recreate fmbuthia@safaricom.co.ke with all GoTrue required fields
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'fmbuthia@safaricom.co.ke';
  v_password text := 'Safaricom2026!';
  v_full_name text := 'F. Mbuthia';
begin
  -- Remove any existing/corrupted records in auth.identities and auth.users
  delete from auth.identities where user_id in (select id from auth.users where lower(email) = v_email);
  delete from auth.users where lower(email) = v_email;

  -- Insert into auth.users with all GoTrue non-null string fields initialized to ''
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

  -- Insert identity with native UUID id matching user_id
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

  -- Ensure public.allowed_users has fmbuthia as approver
  insert into public.allowed_users (email, full_name, role, is_active)
  values (v_email, v_full_name, 'approver', true)
  on conflict (email) do update
  set role = 'approver',
      is_active = true,
      full_name = v_full_name;
end $$;
