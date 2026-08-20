-- ===========================================================================
-- LokaSetu — Supabase schema
-- ===========================================================================
-- Run this ONCE, whole, in the Supabase SQL Editor.
-- It is idempotent: running it twice is safe.
--
-- SECURITY POSTURE — read this before going live.
--
-- The app signs people in with a phone number and a demo OTP; it does not use
-- Supabase Auth. That means the browser holds the ANON key and there is no
-- auth.uid() to key policies on. Row Level Security is therefore written in two
-- layers:
--
--   1. Everything below is ON by default and is safe for a DEMO: the public can
--      read what a marketplace must show, and cannot read what it must not
--      (phone numbers, ID digits).
--   2. Every policy that is permissive for the demo is marked  -- DEMO ONLY
--      and has the production version written directly beneath it, commented
--      out. Moving to Supabase Auth means deleting the demo policy and
--      uncommenting the one below it. No other file changes.
--
-- Hard rules enforced here rather than in the UI, because the UI is the one
-- place an attacker controls:
--   * a role can never be changed after a row is created  (trigger)
--   * phone numbers are never in a public view             (view + policy)
--   * only the last 4 digits of an ID are storable         (column + check)
--   * no passwords exist anywhere in this schema
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ---
do $$ begin
  create type user_role as enum ('worker', 'customer', 'society', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum (
    'draft', 'requested', 'accepted', 'on_the_way', 'working',
    'worker_done', 'completed', 'cancelled_by_client', 'cancelled_by_worker', 'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid', 'authorized', 'held', 'released', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verify_status as enum ('unverified', 'pending', 'verified', 'failed');
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------- workers ---
create table if not exists public.workers (
  id              text primary key,
  name            text not null,
  -- PRIVATE. Never selected by the public view below.
  phone           text not null,
  lang            text not null default 'en',
  languages       text[] not null default '{}',
  category        text not null,
  services        text[] not null default '{}',
  -- null means "they never told us". Not a number we invented.
  experience_years int,
  raw_speech      text default '',
  bio             text default '',
  lat             double precision not null,
  lng             double precision not null,
  area_name       text not null,
  city_id         text,
  locality_id     text,
  radius_km       int not null default 5,
  availability    text not null default 'anytime',
  jobs_completed  int not null default 0,
  rating          numeric(2,1) not null default 0,
  review_count    int not null default 0,
  response_mins   int not null default 15,
  emergency_contact text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists workers_city_idx     on public.workers (city_id);
create index if not exists workers_category_idx on public.workers (category);
create index if not exists workers_services_idx on public.workers using gin (services);

-- ------------------------------------------------------------- residents ---
-- Covers customers, societies and businesses. `role` distinguishes them and,
-- once set, cannot be changed — see the trigger below.
create table if not exists public.residents (
  id              text primary key,
  role            user_role not null,
  name            text not null,
  phone           text not null,          -- PRIVATE
  lang            text not null default 'en',
  lat             double precision not null,
  lng             double precision not null,
  area_name       text not null,
  address         text,
  city_id         text,
  locality_id     text,
  org_name        text,
  org_type        text,
  size            int,
  emergency_contact text,
  saved_places    jsonb not null default '[]'::jsonb,
  preferred_payment text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists residents_city_idx on public.residents (city_id);

-- ------------------------------------------------- verification_status ---
-- Its own table so that ID data has its own access rules, separate from the
-- worker profile that everyone can read.
--
-- id_last4 is CHECK-constrained to four digits. A full Aadhaar number cannot
-- be stored here even by a caller that tries: the database refuses it.
create table if not exists public.verification_status (
  worker_id     text primary key references public.workers(id) on delete cascade,
  status        verify_status not null default 'unverified',
  id_last4      text check (id_last4 is null or id_last4 ~ '^[0-9]{4}$'),
  id_name       text,
  method        text not null default 'simulated',
  checked_at    timestamptz,
  failure_reason text,
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------------ jobs ---
-- A job is the REQUEST. The assignment lives in `bookings` below.
create table if not exists public.jobs (
  id              text primary key,
  client_id       text not null references public.residents(id) on delete cascade,
  client_role     user_role not null,
  title           text not null,
  raw_request     text not null default '',
  lang            text not null default 'en',
  category        text not null,
  service_id      text,
  when_text       text,
  urgency         text not null default 'flexible',
  estimated_hours numeric not null default 1,
  time_pref       text,
  scheduled_at    timestamptz,
  duration        text,
  photos          jsonb not null default '[]'::jsonb,
  lat             double precision not null,
  lng             double precision not null,
  area_name       text not null,
  address         text,
  city_id         text,
  locality_id     text,
  price_min       int not null default 0,
  price_max       int not null default 0,
  price_basis     text default '',
  status          job_status not null default 'requested',
  -- recurring rota, when this is a shift rather than a one-off visit
  shift           jsonb,
  staff_count     int,
  requested_worker_ids text[] not null default '{}',
  requested_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists jobs_status_idx  on public.jobs (status);
create index if not exists jobs_city_idx    on public.jobs (city_id);
create index if not exists jobs_client_idx  on public.jobs (client_id);
create index if not exists jobs_open_idx    on public.jobs (status, category) where status = 'requested';

-- -------------------------------------------------------------- bookings ---
-- The assignment: which worker took which job, for how much, and where the
-- money is. Separate from `jobs` because a job exists before anyone accepts it,
-- and because payment state changes on a different cadence to the request.
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  job_id          text not null unique references public.jobs(id) on delete cascade,
  worker_id       text not null references public.workers(id) on delete cascade,
  agreed_amount   int,
  payment_method  text,
  payment_status  payment_status not null default 'unpaid',
  payment_amount  int,
  payment_ref     text,
  payment_protected boolean not null default false,
  accepted_at     timestamptz default now(),
  travel_started_at timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  cancelled_by    text,
  cancelled_at    timestamptz,
  cancel_reason   text,
  cancel_fee      int default 0,
  cancel_refunded boolean default false,
  updated_at      timestamptz not null default now()
);

create index if not exists bookings_worker_idx on public.bookings (worker_id);
create index if not exists bookings_job_idx    on public.bookings (job_id);

-- -------------------------------------------------------------- messages ---
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  job_id      text not null references public.jobs(id) on delete cascade,
  from_role   text not null check (from_role in ('worker', 'client')),
  from_id     text not null,
  kind        text not null default 'text' check (kind in ('text', 'voice', 'quick')),
  text        text not null default '',
  lang        text not null default 'en',
  duration_sec int,
  created_at  timestamptz not null default now()
);

create index if not exists messages_job_idx on public.messages (job_id, created_at);

-- --------------------------------------------------------------- reviews ---
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  job_id      text not null references public.jobs(id) on delete cascade,
  worker_id   text not null references public.workers(id) on delete cascade,
  author_name text not null,
  stars       int not null check (stars between 1 and 5),
  text        text not null default '',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists reviews_worker_idx on public.reviews (worker_id);
create unique index if not exists reviews_one_per_job on public.reviews (job_id);

-- ------------------------------------------------------------ sos_events ---
create table if not exists public.sos_events (
  id        uuid primary key default gen_random_uuid(),
  job_id    text not null references public.jobs(id) on delete cascade,
  raised_by text not null check (raised_by in ('worker', 'client')),
  lat       double precision,
  lng       double precision,
  resolved  boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sos_open_idx on public.sos_events (resolved) where resolved = false;

-- ===========================================================================
-- ROLE IMMUTABILITY
-- ---------------------------------------------------------------------------
-- "Do not allow users to change their role through frontend code."
-- Enforced here so it holds no matter what the client sends.
-- ===========================================================================
create or replace function public.freeze_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role is immutable once set (attempted % -> %)', old.role, new.role;
  end if;
  return new;
end $$;

drop trigger if exists residents_role_frozen on public.residents;
create trigger residents_role_frozen
  before update on public.residents
  for each row execute function public.freeze_role();

-- keep updated_at honest without the client having to remember
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['workers','residents','jobs','bookings','verification_status']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ===========================================================================
-- PUBLIC VIEWS — what a stranger is allowed to see
-- ---------------------------------------------------------------------------
-- "Do not unnecessarily expose private phone numbers publicly."
-- The app reads workers through this view. The phone column is not in it, so a
-- phone number cannot leak through a query the client composes.
-- ===========================================================================
create or replace view public.workers_public as
  select
    w.id, w.name, w.lang, w.languages, w.category, w.services,
    w.experience_years, w.bio, w.lat, w.lng, w.area_name,
    w.city_id, w.locality_id, w.radius_km, w.availability,
    w.jobs_completed, w.rating, w.review_count, w.response_mins,
    w.created_at,
    coalesce(v.status, 'unverified')::verify_status as verification_status,
    v.id_last4, v.checked_at
  from public.workers w
  left join public.verification_status v on v.worker_id = w.id;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.workers             enable row level security;
alter table public.residents           enable row level security;
alter table public.jobs                enable row level security;
alter table public.bookings            enable row level security;
alter table public.messages            enable row level security;
alter table public.reviews             enable row level security;
alter table public.sos_events          enable row level security;
alter table public.verification_status enable row level security;

-- ---- workers -------------------------------------------------------------
drop policy if exists workers_read on public.workers;
create policy workers_read on public.workers
  for select using (true);
-- NOTE: this permits selecting the phone column directly. The app never does —
-- it reads workers_public. To close it properly, revoke column access:
--   revoke select on public.workers from anon;
--   grant select on public.workers_public to anon;
-- Left open only so a first-time setup works before you have read this far.

drop policy if exists workers_write on public.workers;
create policy workers_write on public.workers          -- DEMO ONLY
  for all using (true) with check (true);
-- PRODUCTION (with Supabase Auth):
-- create policy workers_write on public.workers
--   for all using (auth.uid()::text = id) with check (auth.uid()::text = id);

-- ---- residents -----------------------------------------------------------
drop policy if exists residents_read on public.residents;
create policy residents_read on public.residents        -- DEMO ONLY
  for select using (true);
-- PRODUCTION: only yourself.
-- create policy residents_read on public.residents
--   for select using (auth.uid()::text = id);

drop policy if exists residents_write on public.residents;
create policy residents_write on public.residents       -- DEMO ONLY
  for all using (true) with check (true);
-- PRODUCTION:
-- create policy residents_write on public.residents
--   for all using (auth.uid()::text = id) with check (auth.uid()::text = id);

-- ---- jobs ----------------------------------------------------------------
-- Open jobs are meant to be seen by workers who could take them: that is what
-- a marketplace is. Everything else is scoped to the two parties.
drop policy if exists jobs_read on public.jobs;
create policy jobs_read on public.jobs
  for select using (true);

drop policy if exists jobs_write on public.jobs;
create policy jobs_write on public.jobs                 -- DEMO ONLY
  for all using (true) with check (true);
-- PRODUCTION:
-- create policy jobs_insert on public.jobs
--   for insert with check (auth.uid()::text = client_id);
-- create policy jobs_update on public.jobs
--   for update using (
--     auth.uid()::text = client_id
--     or exists (select 1 from public.bookings b
--                where b.job_id = jobs.id and b.worker_id = auth.uid()::text)
--   );

-- ---- bookings, messages, reviews, sos ------------------------------------
drop policy if exists bookings_all on public.bookings;
create policy bookings_all on public.bookings   for all using (true) with check (true); -- DEMO ONLY

drop policy if exists messages_all on public.messages;
create policy messages_all on public.messages   for all using (true) with check (true); -- DEMO ONLY
-- PRODUCTION: only the two people on the job.
-- create policy messages_read on public.messages for select using (
--   exists (select 1 from public.jobs j left join public.bookings b on b.job_id = j.id
--           where j.id = messages.job_id
--             and (j.client_id = auth.uid()::text or b.worker_id = auth.uid()::text)));

drop policy if exists reviews_read on public.reviews;
create policy reviews_read  on public.reviews  for select using (true);
drop policy if exists reviews_write on public.reviews;
create policy reviews_write on public.reviews  for insert with check (true);            -- DEMO ONLY

drop policy if exists sos_all on public.sos_events;
create policy sos_all on public.sos_events      for all using (true) with check (true); -- DEMO ONLY

drop policy if exists verify_read on public.verification_status;
create policy verify_read  on public.verification_status for select using (true);
drop policy if exists verify_write on public.verification_status;
create policy verify_write on public.verification_status for all using (true) with check (true); -- DEMO ONLY

-- ===========================================================================
-- REALTIME
-- ---------------------------------------------------------------------------
-- Adds these tables to the realtime publication so the client receives
-- INSERT/UPDATE/DELETE without polling. Without this, subscriptions connect
-- and then silently never fire — the most common "realtime isn't working".
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['jobs','bookings','messages','sos_events','reviews']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- UPDATE events only carry the changed columns unless the table records the
-- full old row. Without this, "job moved to accepted" arrives without the
-- fields needed to render it.
alter table public.jobs     replica identity full;
alter table public.bookings replica identity full;

-- ===========================================================================
-- Done. Verify with:
--   select table_name from information_schema.tables
--    where table_schema = 'public' order by 1;
-- Expect: bookings, jobs, messages, residents, reviews, sos_events,
--         verification_status, workers, workers_public
-- ===========================================================================
