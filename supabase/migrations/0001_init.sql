-- ==============================================================
-- PROFILES AND WEIGHT LOG
-- ==============================================================
-- Two tables, both locked to the signed-in user by row level
-- security. This is health data: age, weight, and a body goal.
-- Nobody but the owner should ever be able to read a row, and RLS
-- is what enforces that at the database rather than trusting every
-- query we write afterwards.
--
-- Plans are deliberately NOT stored. A week is deterministic from
-- the profile, so it is recomputed on every visit — that keeps the
-- data we hold to the minimum the app actually needs.
-- ==============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  age         integer not null check (age between 13 and 100),
  sex         text    not null check (sex in ('female', 'male')),
  height_cm   integer not null check (height_cm between 120 and 230),
  weight_kg   numeric(5, 1) not null check (weight_kg between 30 and 300),
  -- Optional. A BMR the person actually had measured, which beats the
  -- Mifflin-St Jeor estimate whenever it exists. Null means "use the
  -- formula", which is what almost everyone will do.
  measured_bmr integer check (measured_bmr between 600 and 4500),
  activity    text    not null check (activity in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal        text    not null check (goal in ('lose', 'maintain', 'gain')),
  diet        text    not null check (diet in ('veg', 'egg', 'nonveg', 'vegan')),
  equipment   text    not null default 'Bodyweight only',
  -- Something they actually want to eat. Fed to the planner so the week
  -- includes it rather than making them fight the craving.
  craving     text    check (char_length(craving) <= 120),
  -- The browser's IANA zone. "Today" is the user's today, not the
  -- server's: Vercel runs UTC, so a server-side date would roll the
  -- plan over at 5:30am in India.
  timezone    text    not null default 'Asia/Kolkata',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One weight per day. Re-logging the same day corrects it rather
-- than adding a second reading, which is what people actually mean
-- when they weigh themselves twice.
create table if not exists public.weight_log (
  user_id    uuid not null references auth.users on delete cascade,
  logged_at  date not null default current_date,
  weight_kg  numeric(5, 1) not null check (weight_kg between 30 and 300),
  primary key (user_id, logged_at)
);

create index if not exists weight_log_user_date_idx
  on public.weight_log (user_id, logged_at desc);

-- ---------------- Row level security ----------------

alter table public.profiles  enable row level security;
alter table public.weight_log enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile write"  on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own profile delete" on public.profiles;

create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile write"  on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile delete" on public.profiles for delete using (auth.uid() = id);

drop policy if exists "own weights read"   on public.weight_log;
drop policy if exists "own weights write"  on public.weight_log;
drop policy if exists "own weights update" on public.weight_log;
drop policy if exists "own weights delete" on public.weight_log;

create policy "own weights read"   on public.weight_log for select using (auth.uid() = user_id);
create policy "own weights write"  on public.weight_log for insert with check (auth.uid() = user_id);
create policy "own weights update" on public.weight_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weights delete" on public.weight_log for delete using (auth.uid() = user_id);

-- ---------------- Keep updated_at honest ----------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------- Weight changes flow into the profile ----------------

-- The whole point of logging weight is that the targets follow it
-- down. Doing that here means the profile can never disagree with
-- the most recent reading, whatever route wrote it.
create or replace function public.sync_profile_weight()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set weight_kg = new.weight_kg
   where id = new.user_id
     and not exists (
       select 1 from public.weight_log
        where user_id = new.user_id
          and logged_at > new.logged_at
     );
  return new;
end;
$$;

drop trigger if exists weight_log_sync_profile on public.weight_log;
create trigger weight_log_sync_profile
  after insert or update on public.weight_log
  for each row execute function public.sync_profile_weight();
