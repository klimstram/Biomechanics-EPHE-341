-- =====================================================================
-- Biomechanics Tutor: optional usernames and passwords (Supabase), EPHE 341
--
-- Run this AFTER supabase-setup.sql: SQL Editor -> New query -> paste all
-- of it -> Run. Nothing to change in it. Safe to run again (running this
-- newer version over the first one keeps every account).
--
-- A student who makes an account can sign in on any device and get their
-- history back. No email, no real name: just a username they make up and a
-- password. Students who never make one carry on as before (sync code).
--
-- How it works: an account stores the student's private sync code. Signing
-- in hands that code to the new device, which then fetches the history the
-- usual way. Passwords are stored only as bcrypt hashes (pgcrypto).
-- After 10 wrong tries in a row an account waits 15 minutes.
--
-- Forgotten passwords, without email:
--   - Each account gets a RECOVERY CODE when it is made (shown once, e.g.
--     4F2A-9C1B-77DE-03A5). With it a student sets a new password on their
--     own, and gets a fresh code. Signed-in students can make a new one.
--   - Or the instructor resets it on the admin page (#/instructor ->
--     Student accounts), with the instructor key: pick the username, give a
--     temporary password. That page also lists the accounts.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.tutor_accounts (
  username     text primary key,               -- lower case, made up by the student
  pass         text not null,                  -- bcrypt hash
  code         text not null,                  -- the account's private sync code
  created_at   timestamptz not null default now(),
  last_login   timestamptz,
  failed       integer not null default 0,
  locked_until timestamptz
);
alter table public.tutor_accounts add column if not exists recovery text;   -- bcrypt hash of the recovery code
alter table public.tutor_accounts enable row level security;   -- no policies: functions only

-- a new recovery code: 16 letters/digits in four groups, shown to the student once
create or replace function public.tutor_new_recovery_code() returns text
language sql volatile set search_path = public, extensions, pg_catalog as $$
  select upper(substr(h, 1, 4) || '-' || substr(h, 5, 4) || '-' || substr(h, 9, 4) || '-' || substr(h, 13, 4))
  from (select encode(gen_random_bytes(8), 'hex') as h) x
$$;
create or replace function public.tutor_norm_recovery(t text) returns text
language sql immutable as $$ select upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- a wrong try (password or recovery code) counts towards the 15-minute wait
create or replace function public.tutor_wrong_try(u text) returns void
language sql security definer set search_path = public, pg_catalog as $$
  update tutor_accounts t set failed = t.failed + 1,
    locked_until = case when t.failed + 1 >= 10 then now() + interval '15 minutes' else null end
  where t.username = u
$$;

-- make an account for the code this browser already uses
create or replace function public.tutor_signup(uname text, pw text, code text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_catalog as $$
declare u text := lower(btrim(coalesce(uname, ''))); rc text;
begin
  if u !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    return jsonb_build_object('error', 'A username is 3 to 30 letters or numbers (dots, dashes and underscores are fine too).');
  end if;
  if length(coalesce(pw, '')) < 8 then
    return jsonb_build_object('error', 'Use a password of at least 8 characters.');
  end if;
  if code is null or length(code) < 12 or length(code) > 80 then
    return jsonb_build_object('error', 'This browser has no sync code yet. Reload the page and try again.');
  end if;
  if exists (select 1 from tutor_accounts a where a.username = u) then
    return jsonb_build_object('error', 'That username is taken. Try another.');
  end if;
  rc := tutor_new_recovery_code();
  insert into tutor_accounts (username, pass, code, recovery)
  values (u, crypt(pw, gen_salt('bf', 8)), code, crypt(tutor_norm_recovery(rc), gen_salt('bf', 8)));
  return jsonb_build_object('username', u, 'recovery', rc);
end $$;

-- sign in: the account's code, or why not
create or replace function public.tutor_login(uname text, pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_catalog as $$
declare u text := lower(btrim(coalesce(uname, ''))); a tutor_accounts%rowtype;
begin
  select * into a from tutor_accounts t where t.username = u;
  if not found then
    perform crypt('x', gen_salt('bf', 8));      -- take as long as a real check
    return jsonb_build_object('error', 'Wrong username or password.');
  end if;
  if a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('error', 'Too many wrong tries. Wait 15 minutes, then try again.');
  end if;
  if a.pass <> crypt(coalesce(pw, ''), a.pass) then
    perform tutor_wrong_try(u);
    return jsonb_build_object('error', 'Wrong username or password.');
  end if;
  update tutor_accounts t set failed = 0, locked_until = null, last_login = now() where t.username = u;
  return jsonb_build_object('username', u, 'code', a.code);
end $$;

-- change the password (needs the current one)
create or replace function public.tutor_change_password(uname text, pw text, new_pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_catalog as $$
declare r jsonb;
begin
  if length(coalesce(new_pw, '')) < 8 then
    return jsonb_build_object('error', 'Use a new password of at least 8 characters.');
  end if;
  r := tutor_login(uname, pw);
  if r ? 'error' then return r; end if;
  update tutor_accounts t set pass = crypt(new_pw, gen_salt('bf', 8))
  where t.username = lower(btrim(uname));
  return jsonb_build_object('username', r->>'username');
end $$;

-- a new recovery code for a signed-in student (needs the password; the old code stops working)
create or replace function public.tutor_new_recovery(uname text, pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_catalog as $$
declare r jsonb; rc text;
begin
  r := tutor_login(uname, pw);
  if r ? 'error' then return r; end if;
  rc := tutor_new_recovery_code();
  update tutor_accounts t set recovery = crypt(tutor_norm_recovery(rc), gen_salt('bf', 8))
  where t.username = r->>'username';
  return jsonb_build_object('username', r->>'username', 'recovery', rc);
end $$;

-- forgot the password: the recovery code sets a new one (and is replaced by a fresh code)
create or replace function public.tutor_recover(uname text, recovery text, new_pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_catalog as $$
declare u text := lower(btrim(coalesce(uname, ''))); a tutor_accounts%rowtype; rc text;
begin
  if length(coalesce(new_pw, '')) < 8 then
    return jsonb_build_object('error', 'Use a new password of at least 8 characters.');
  end if;
  select * into a from tutor_accounts t where t.username = u;
  if not found or a.recovery is null then
    perform crypt('x', gen_salt('bf', 8));
    return jsonb_build_object('error', 'That username and recovery code do not match.');
  end if;
  if a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('error', 'Too many wrong tries. Wait 15 minutes, then try again.');
  end if;
  if a.recovery <> crypt(tutor_norm_recovery(recovery), a.recovery) then
    perform tutor_wrong_try(u);
    return jsonb_build_object('error', 'That username and recovery code do not match.');
  end if;
  rc := tutor_new_recovery_code();
  update tutor_accounts t set pass = crypt(new_pw, gen_salt('bf', 8)),
    recovery = crypt(tutor_norm_recovery(rc), gen_salt('bf', 8)),
    failed = 0, locked_until = null, last_login = now()
  where t.username = u;
  return jsonb_build_object('username', u, 'code', a.code, 'recovery', rc);
end $$;

-- the instructor resets a password (class results page, with the instructor key)
create or replace function public.tutor_admin_reset(key text, uname text, new_pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_catalog as $$
declare u text := lower(btrim(coalesce(uname, '')));
begin
  perform tutor_check_key(key);
  if length(coalesce(new_pw, '')) < 8 then
    return jsonb_build_object('error', 'Use a temporary password of at least 8 characters.');
  end if;
  update tutor_accounts t set pass = crypt(new_pw, gen_salt('bf', 8)), failed = 0, locked_until = null
  where t.username = u;
  if not found then return jsonb_build_object('error', 'There is no account called ' || u || '.'); end if;
  return jsonb_build_object('username', u);
end $$;

-- the instructor's list of accounts (class results page -> Student accounts)
create or replace function public.tutor_admin_accounts(key text)
returns table (username text, created_at timestamptz, last_login timestamptz, locked boolean, has_recovery boolean)
language plpgsql stable security definer set search_path = public, pg_catalog as $$
begin
  perform tutor_check_key(key);
  return query
    select a.username, a.created_at, a.last_login,
           (a.locked_until is not null and a.locked_until > now()), a.recovery is not null
    from tutor_accounts a order by a.username;
end $$;

revoke all on function public.tutor_wrong_try(text) from public, anon, authenticated;
revoke all on function public.tutor_new_recovery_code() from public, anon, authenticated;
revoke all on function public.tutor_signup(text, text, text) from public;
revoke all on function public.tutor_login(text, text) from public;
revoke all on function public.tutor_change_password(text, text, text) from public;
revoke all on function public.tutor_new_recovery(text, text) from public;
revoke all on function public.tutor_recover(text, text, text) from public;
revoke all on function public.tutor_admin_reset(text, text, text) from public;
revoke all on function public.tutor_admin_accounts(text) from public;
grant execute on function public.tutor_signup(text, text, text) to anon, authenticated;
grant execute on function public.tutor_login(text, text) to anon, authenticated;
grant execute on function public.tutor_change_password(text, text, text) to anon, authenticated;
grant execute on function public.tutor_new_recovery(text, text) to anon, authenticated;
grant execute on function public.tutor_recover(text, text, text) to anon, authenticated;
grant execute on function public.tutor_admin_reset(text, text, text) to anon, authenticated;
grant execute on function public.tutor_admin_accounts(text) to anon, authenticated;
