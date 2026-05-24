-- =====================================================================
-- FITSTAT REMOTE DATABASE SCHEMA & SYNC SETUP FOR SUPABASE
-- Run this in the Supabase SQL Editor (https://database.new)
-- =====================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ── 1. USERS BRIDGE TABLE ───────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  email text,
  number text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.users enable row level security;

-- RLS Policies for Users
create policy "Allow public read access to users profiles"
  on public.users for select
  using (true);

create policy "Allow users to update their own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ── 2. FOOD ITEMS TABLE ─────────────────────────────────────────────
create table public.food_items (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  calories double precision not null default 0,
  protein double precision not null default 0,
  carbs double precision not null default 0,
  fat double precision not null default 0,
  fiber double precision not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.food_items enable row level security;

-- RLS Policies for Food Items
create policy "Allow read access to global and personal food items"
  on public.food_items for select
  using (user_id is null or user_id = auth.uid());

create policy "Allow users to insert their own food items"
  on public.food_items for insert
  with check (user_id = auth.uid());

create policy "Allow users to update their own food items"
  on public.food_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Allow users to delete their own food items"
  on public.food_items for delete
  using (user_id = auth.uid());


-- ── 3. MEAL LOGS TABLE ──────────────────────────────────────────────
create table public.meal_logs (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  food_id text not null references public.food_items(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')),
  servings double precision not null default 1,
  logged_at date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.meal_logs enable row level security;

-- RLS Policies for Meal Logs
create policy "Allow users to read their own meal logs"
  on public.meal_logs for select
  using (user_id = auth.uid());

create policy "Allow users to insert their own meal logs"
  on public.meal_logs for insert
  with check (user_id = auth.uid());

create policy "Allow users to update their own meal logs"
  on public.meal_logs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Allow users to delete their own meal logs"
  on public.meal_logs for delete
  using (user_id = auth.uid());


-- ── 4. EXERCISES TABLE ──────────────────────────────────────────────
create table public.exercises (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  muscle_group text not null check (muscle_group in ('abs','back','biceps','cardio','chest','forearms','legs','shoulders','triceps')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.exercises enable row level security;

-- RLS Policies for Exercises
create policy "Allow read access to global and custom exercises"
  on public.exercises for select
  using (user_id is null or user_id = auth.uid());

create policy "Allow users to insert their own custom exercises"
  on public.exercises for insert
  with check (user_id = auth.uid());

create policy "Allow users to update their own custom exercises"
  on public.exercises for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Allow users to delete their own custom exercises"
  on public.exercises for delete
  using (user_id = auth.uid());


-- ── 5. WORKOUT LOGS TABLE ───────────────────────────────────────────
create table public.workout_logs (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  logged_at date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, logged_at)
);

-- Enable RLS
alter table public.workout_logs enable row level security;

-- RLS Policies for Workout Logs
create policy "Allow users to read their own workout logs"
  on public.workout_logs for select
  using (user_id = auth.uid());

create policy "Allow users to insert their own workout logs"
  on public.workout_logs for insert
  with check (user_id = auth.uid());

create policy "Allow users to update their own workout logs"
  on public.workout_logs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Allow users to delete their own workout logs"
  on public.workout_logs for delete
  using (user_id = auth.uid());


-- ── 6. EXERCISE SETS TABLE ──────────────────────────────────────────
create table public.exercise_sets (
  id text primary key,
  workout_log_id text not null references public.workout_logs(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete cascade,
  weight double precision not null default 0,
  reps integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.exercise_sets enable row level security;

-- RLS Policies for Exercise Sets
create policy "Allow users to read their own exercise sets"
  on public.exercise_sets for select
  using (
    exists (
      select 1 from public.workout_logs
      where public.workout_logs.id = public.exercise_sets.workout_log_id
      and public.workout_logs.user_id = auth.uid()
    )
  );

create policy "Allow users to insert sets in their own workout logs"
  on public.exercise_sets for insert
  with check (
    exists (
      select 1 from public.workout_logs
      where public.workout_logs.id = public.exercise_sets.workout_log_id
      and public.workout_logs.user_id = auth.uid()
    )
  );

create policy "Allow users to update sets in their own workout logs"
  on public.exercise_sets for update
  using (
    exists (
      select 1 from public.workout_logs
      where public.workout_logs.id = public.exercise_sets.workout_log_id
      and public.workout_logs.user_id = auth.uid()
    )
  );

create policy "Allow users to delete sets in their own workout logs"
  on public.exercise_sets for delete
  using (
    exists (
      select 1 from public.workout_logs
      where public.workout_logs.id = public.exercise_sets.workout_log_id
      and public.workout_logs.user_id = auth.uid()
    )
  );


-- ── 7. AUTO-SYNC AUTH USER TO PUBLIC USERS TRIGGER ──────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', substring(new.email from '([^@]+)')),
    coalesce(new.raw_user_meta_data->>'name', 'FitStat User'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();