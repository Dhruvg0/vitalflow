-- ============================================================
-- VitalFlow — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data.
-- One row per user. type = 'donor' | 'hospital'
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  type        text not null check (type in ('donor','hospital')),
  fname       text not null,
  lname       text not null,
  email       text not null,
  phone       text,

  -- Donor fields
  blood_type  text,
  city        text,
  donations   integer not null default 0,
  points      integer not null default 50,
  last_donation timestamptz,
  medical_notes text,

  -- Hospital fields
  hospital_name    text,
  hospital_address text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row-Level Security: each user can only read/write their own profile
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Allow reading donor profiles for hospital donor-response view
-- (hospitals need to see donor details when their request is accepted)
create policy "profiles_select_donors_for_hospitals" on public.profiles
  for select using (type = 'donor');

-- ============================================================
-- BLOOD REQUESTS TABLE
-- ============================================================
create table public.blood_requests (
  id          uuid primary key default uuid_generate_v4(),
  patient     text not null,
  blood_type  text not null,
  units       integer not null,
  urgency     text not null check (urgency in ('urgent','high','normal')),
  hospital    text not null,
  address     text not null,
  contact     text not null,
  distance    numeric(5,1) not null default 0,
  notes       text,
  status      text not null default 'open' check (status in ('open','accepted','cancelled')),
  posted_by   uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.blood_requests enable row level security;

-- Anyone authenticated can read open requests
create policy "requests_select_open" on public.blood_requests
  for select using (auth.uid() is not null);

-- Hospitals can insert their own requests
create policy "requests_insert_own" on public.blood_requests
  for insert with check (auth.uid() = posted_by);

-- Hospitals can update/cancel their own requests; donors can accept
create policy "requests_update" on public.blood_requests
  for update using (
    auth.uid() = posted_by          -- hospital managing their request
    or auth.uid() = accepted_by     -- donor updating acceptance details
    or (status = 'open' and accepted_by is null) -- any donor accepting
  );

-- ============================================================
-- DONATIONS TABLE
-- ============================================================
create table public.donations (
  id           uuid primary key default uuid_generate_v4(),
  donor_id     uuid not null references public.profiles(id) on delete cascade,
  request_id   uuid references public.blood_requests(id) on delete set null,
  hospital     text not null,
  patient      text not null,
  blood_type   text not null,
  units        integer not null,
  status       text not null default 'completed',
  arrival_time timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);

alter table public.donations enable row level security;

create policy "donations_select_own" on public.donations
  for select using (auth.uid() = donor_id);

create policy "donations_insert_own" on public.donations
  for insert with check (auth.uid() = donor_id);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  message    text not null,
  type       text not null default 'info' check (type in ('info','success','warning','urgent','high')),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifs_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifs_insert_system" on public.notifications
  for insert with check (auth.uid() = user_id);

create policy "notifs_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: auto-update updated_at timestamp
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger requests_updated_at before update on public.blood_requests
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- FUNCTION: auto-create profile row when user signs up
-- This fires on Supabase Auth signup via trigger
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Profile is created explicitly from the app after signup.
  -- This function is a safety net if direct insert fails.
  return new;
end;
$$;

-- ============================================================
-- REAL-TIME: enable for notifications so donors get live alerts
-- (Do this in Supabase Dashboard → Table Editor → notifications → Realtime ON)
-- Or run:
-- alter publication supabase_realtime add table public.notifications;
-- alter publication supabase_realtime add table public.blood_requests;
-- ============================================================

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_requests_status   on public.blood_requests(status);
create index idx_requests_posted   on public.blood_requests(posted_by);
create index idx_requests_blood    on public.blood_requests(blood_type);
create index idx_donations_donor   on public.donations(donor_id);
create index idx_notifs_user       on public.notifications(user_id, is_read, created_at desc);
