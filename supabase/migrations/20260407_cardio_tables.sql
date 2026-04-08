-- cardio_plans: AI-generated multi-week training programs
create table public.cardio_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  exercise_type text not null default 'treadmill',
  name text not null,
  goal text not null,
  fitness_level text not null,
  total_weeks integer not null,
  sessions_per_week integer not null,
  plan_data jsonb not null,
  status text not null default 'active',
  current_week integer not null default 1,
  current_session integer not null default 1,
  created_at timestamptz default now() not null,

  constraint cardio_plans_exercise_type_check
    check (exercise_type in ('treadmill', 'cycling', 'rowing')),
  constraint cardio_plans_fitness_level_check
    check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  constraint cardio_plans_status_check
    check (status in ('active', 'paused', 'completed')),
  constraint cardio_plans_sessions_per_week_check
    check (sessions_per_week between 2 and 5)
);

-- cardio_sessions: completed cardio workouts
create table public.cardio_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id uuid references public.cardio_plans(id) on delete set null,
  exercise_type text not null default 'treadmill',
  session_date date not null default current_date,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_minutes numeric not null,
  total_distance numeric,
  avg_speed numeric,
  plan_week integer,
  plan_session integer,
  notes text,

  constraint cardio_sessions_exercise_type_check
    check (exercise_type in ('treadmill', 'cycling', 'rowing'))
);

-- cardio_segments: individual segments within a session
create table public.cardio_segments (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.cardio_sessions(id) on delete cascade not null,
  segment_order integer not null,
  segment_type text not null,
  duration_seconds integer not null,
  distance numeric,
  speed numeric,
  settings jsonb default '{}'::jsonb,
  is_planned boolean not null default true,
  completed boolean not null default false,

  constraint cardio_segments_type_check
    check (segment_type in ('warm_up', 'main', 'cool_down', 'interval'))
);

-- indexes
create index cardio_plans_user_id_idx on public.cardio_plans(user_id);
create index cardio_plans_status_idx on public.cardio_plans(user_id, status);
create index cardio_sessions_user_id_idx on public.cardio_sessions(user_id);
create index cardio_sessions_plan_id_idx on public.cardio_sessions(plan_id);
create index cardio_sessions_date_idx on public.cardio_sessions(user_id, session_date);
create index cardio_segments_session_id_idx on public.cardio_segments(session_id);

-- RLS policies
alter table public.cardio_plans enable row level security;
alter table public.cardio_sessions enable row level security;
alter table public.cardio_segments enable row level security;

create policy "Users can manage own cardio plans"
  on public.cardio_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own cardio sessions"
  on public.cardio_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own cardio segments"
  on public.cardio_segments for all
  using (
    exists (
      select 1 from public.cardio_sessions
      where cardio_sessions.id = cardio_segments.session_id
        and cardio_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cardio_sessions
      where cardio_sessions.id = cardio_segments.session_id
        and cardio_sessions.user_id = auth.uid()
    )
  );
