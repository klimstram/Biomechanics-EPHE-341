-- =====================================================================
-- Biomechanics Tutor: the online answer store (Supabase), EPHE 341
--
-- Paste all of this into Supabase: SQL Editor -> New query -> Run.
-- It is safe to run again later (it updates, it never deletes data).
--
-- What it makes
--   tutor_events    every answer the Tutor sends: no names, no emails.
--                   Each student is a "learner": the SHA-256 of a private
--                   sync code that only their browser knows.
--   tutor_settings  the SHA-256 of your instructor key.
--
-- Nobody can read or write those tables directly (row level security is
-- on, with no policies). The Tutor can only call these functions:
--   tutor_add(code, rows)       add a batch of answers; repeats are ignored
--   tutor_history(code, after)  a student's own answers, to restore them
--   tutor_summary(key, since)   class patterns, with the instructor key
--   tutor_export(key, after)    every answer, with the instructor key
-- =====================================================================

create table if not exists public.tutor_events (
  n               bigint generated always as identity,
  learner         text not null,              -- sha-256 of the sync code
  id              text not null,              -- the event id the Tutor made
  session_id      text not null default '',
  ts              text not null default '',   -- the student's local time
  section         text not null default '',
  question_number text not null default '',
  step            text not null default '',
  action          text not null default '',
  details         text not null default '',
  received_at     timestamptz not null default now(),
  primary key (learner, id)
);
create index if not exists tutor_events_n on public.tutor_events (n);
create index if not exists tutor_events_q on public.tutor_events (section, question_number);
alter table public.tutor_events enable row level security;

create table if not exists public.tutor_settings (k text primary key, v text not null);
alter table public.tutor_settings enable row level security;

create or replace function public.tutor_hash(t text) returns text
language sql immutable set search_path = public, pg_catalog
as $$ select encode(sha256(convert_to(coalesce(t, ''), 'UTF8')), 'hex') $$;

create or replace function public.tutor_check_key(key text) returns void
language plpgsql security definer set search_path = public, pg_catalog as $$
declare want text;
begin
  select v into want from tutor_settings where k = 'instructor_key_sha256';
  if want is null or want = tutor_hash('CHANGE-ME') or tutor_hash(key) <> want then
    raise exception 'wrong instructor key';
  end if;
end $$;

-- ------------------------------------------------ the Tutor sends answers
create or replace function public.tutor_add(code text, rows jsonb) returns integer
language plpgsql security definer set search_path = public, pg_catalog as $$
declare added integer;
begin
  if code is null or length(code) < 12 or length(code) > 80 then
    raise exception 'bad sync code';
  end if;
  if rows is null or jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 500 then
    raise exception 'send at most 500 answers at a time';
  end if;
  insert into tutor_events (learner, id, session_id, ts, section, question_number, step, action, details)
  select tutor_hash(code),
         left(r->>'id', 80),
         left(coalesce(r->>'session_id', ''), 80),
         left(coalesce(r->>'timestamp', ''), 40),
         left(coalesce(r->>'section', ''), 80),
         left(coalesce(r->>'question_number', ''), 20),
         left(coalesce(r->>'step', ''), 20),
         left(coalesce(r->>'action', ''), 40),
         left(coalesce(r->>'details', ''), 4000)
  from jsonb_array_elements(rows) as r
  where coalesce(r->>'id', '') <> '' and coalesce(r->>'action', '') <> ''
  on conflict (learner, id) do nothing;
  get diagnostics added = row_count;
  return added;
end $$;

-- ------------------------------------- a student restores their history
create or replace function public.tutor_history(code text, after bigint default 0)
returns table (n bigint, id text, session_id text, "timestamp" text, section text,
               question_number text, step text, action text, details text)
language sql stable security definer set search_path = public, pg_catalog as $$
  select e.n, e.id, e.session_id, e.ts, e.section, e.question_number, e.step, e.action, e.details
  from tutor_events e
  where e.learner = tutor_hash(code) and e.n > coalesce(after, 0)
  order by e.n
  limit 1000
$$;

-- ------------------------------------------------- what the class does
create or replace function public.tutor_summary(key text, since timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_catalog as $$
declare out jsonb;
begin
  perform tutor_check_key(key);
  with ev as (
    select * from tutor_events where since is null or received_at >= since
  ),
  -- the first pick a student ever made at each step (a retake, on any
  -- visit, does not count again: they may remember it)
  first_pick as (
    select distinct on (learner, section, question_number, step)
           learner, section, question_number, step, details like '%correct=True' as ok
    from ev where action = 'option_selected'
    order by learner, section, question_number, step, ts, n
  ),
  steps as (
    select section, question_number, step,
           count(*) as picks, count(*) filter (where not ok) as slips,
           count(distinct learner) as learners
    from first_pick group by section, question_number, step
  ),
  -- the first answer a student ever gave to each question
  first_answer as (
    select distinct on (learner, section, question_number)
           learner, section, question_number, details like '%correct=True' as ok
    from ev where action = 'answer_submitted'
    order by learner, section, question_number, ts, n
  ),
  questions as (
    select q.section, q.question_number,
           count(distinct q.learner) as learners,
           count(*) filter (where q.action = 'answer_submitted') as answers,
           count(*) filter (where q.action = 'answer_submitted' and q.details like '%correct=True') as correct,
           count(*) filter (where q.action = 'guided_start') as guided,
           count(*) filter (where q.action = 'retry_full') as sent_back,
           (select count(*) from first_answer f where f.section = q.section
              and f.question_number = q.question_number and f.ok) as right_first_time,
           (select count(*) from first_answer f where f.section = q.section
              and f.question_number = q.question_number) as first_answers
    from ev q where q.question_number <> ''
    group by q.section, q.question_number
  )
  select jsonb_build_object(
    'learners', (select count(distinct learner) from ev),
    'events',   (select count(*) from ev),
    'first',    (select min(received_at) from ev),
    'last',     (select max(received_at) from ev),
    'questions', coalesce((select jsonb_agg(to_jsonb(questions)) from questions), '[]'::jsonb),
    'steps',     coalesce((select jsonb_agg(to_jsonb(steps)) from steps), '[]'::jsonb)
  ) into out;
  return out;
end $$;

-- ------------------------------------------- everything, for a CSV copy
create or replace function public.tutor_export(key text, after bigint default 0)
returns table (n bigint, learner text, id text, session_id text, "timestamp" text, section text,
               question_number text, step text, action text, details text, received_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_catalog as $$
begin
  perform tutor_check_key(key);
  return query
    select e.n, left(e.learner, 12), e.id, e.session_id, e.ts, e.section, e.question_number,
           e.step, e.action, e.details, e.received_at
    from tutor_events e where e.n > coalesce(after, 0) order by e.n limit 1000;
end $$;

-- ------------------------------------------- who may call what
revoke all on function public.tutor_check_key(text) from public, anon, authenticated;
revoke all on function public.tutor_add(text, jsonb) from public;
revoke all on function public.tutor_history(text, bigint) from public;
revoke all on function public.tutor_summary(text, timestamptz) from public;
revoke all on function public.tutor_export(text, bigint) from public;
grant execute on function public.tutor_add(text, jsonb) to anon, authenticated;
grant execute on function public.tutor_history(text, bigint) to anon, authenticated;
grant execute on function public.tutor_summary(text, timestamptz) to anon, authenticated;
grant execute on function public.tutor_export(text, bigint) to anon, authenticated;

-- =====================================================================
-- YOUR INSTRUCTOR KEY. Replace CHANGE-ME with a long phrase only you know
-- (e.g. four random words), here in the SQL editor, then run. Do not save
-- the real phrase in the repo copy of this file. Run just this statement
-- again any time to change the key.
-- =====================================================================
insert into public.tutor_settings (k, v)
values ('instructor_key_sha256', public.tutor_hash('CHANGE-ME'))
on conflict (k) do update set v = excluded.v;
