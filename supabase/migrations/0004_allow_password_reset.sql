-- =============================================================================
-- 0004_allow_password_reset.sql
-- Allow setting or resetting the password for any allow-listed team member
-- Run this in the Supabase SQL Editor.
-- =============================================================================

create or replace function public.claim_initial_password(
  p_email text,
  p_password text
)
returns text
as $$
declare
  v_email text := lower(trim(p_email));
  v_user  auth.users%rowtype;
begin
  if length(coalesce(p_password, '')) < 6 then
    return 'weak_password';
  end if;

  if not exists (select 1 from public.allowed_users where email = v_email) then
    return 'not_allowed';
  end if;

  select * into v_user
  from auth.users
  where lower(email) = v_email
  limit 1;

  if not found then
    return 'no_user';
  end if;

  -- Always update password and ensure email is confirmed for allowed team members
  update auth.users
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at         = now()
  where id = v_user.id;

  return 'password_set';
end;
$$ language plpgsql security definer set search_path = '';

grant execute on function public.claim_initial_password(text, text) to anon, authenticated;
