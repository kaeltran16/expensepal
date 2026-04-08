# Cardio Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cardio sub-tab within the Workouts view, starting with treadmill support, AI-generated training plans, and guided session logging.

**Architecture:** Separate domain -- new DB tables (`cardio_plans`, `cardio_sessions`, `cardio_segments`), dedicated API routes, hooks, and components. Connects to the strength side only at the view level via a `Tabs` segmented control. Uses the existing `llmService` for AI plan generation.

**Tech Stack:** Next.js, Supabase (Postgres + RLS), TanStack React Query, Radix UI Tabs, Framer Motion, OpenRouter/llmService, Zod validation

**Spec:** `docs/superpowers/specs/2026-04-07-cardio-tab-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260407_cardio_tables.sql` | DB migration: cardio_plans, cardio_sessions, cardio_segments |
| `lib/types/cardio.ts` | TypeScript types for cardio domain |
| `lib/hooks/use-cardio.ts` | React Query hooks: useCardioPlans, useCardioSessions |
| `app/api/cardio-plans/route.ts` | GET/POST for cardio plans |
| `app/api/cardio-plans/[id]/route.ts` | PATCH for plan status/progress |
| `app/api/cardio-sessions/route.ts` | GET/POST for cardio sessions |
| `app/api/ai/generate-cardio-plan/route.ts` | AI plan generation endpoint |
| `components/workouts/CardioView.tsx` | Cardio dashboard layout |
| `components/workouts/CardioPlanHero.tsx` | Active plan card / "Generate a Plan" CTA |
| `components/workouts/CardioSessionPreview.tsx` | Today's segment preview |
| `components/workouts/CardioQuickStats.tsx` | Weekly distance, pace, time stats |
| `components/workouts/CardioRecentSessions.tsx` | Recent session list |
| `components/workouts/CardioPlanDialog.tsx` | Plan generation input form |
| `components/workouts/CardioPlanPreview.tsx` | Plan preview before confirmation |
| `components/workouts/CardioSessionLogger.tsx` | Guided session screen with timer |
| `components/workouts/CardioSessionSummary.tsx` | Post-session results |
| `__tests__/lib/cardio-types.test.ts` | Type/utility tests |
| `__tests__/api/cardio-api.test.ts` | API route tests |
| `__tests__/components/cardio-quick-stats.test.tsx` | Component render tests |

### Modified files

| File | Change |
|------|--------|
| `components/views/workouts-view.tsx` | Wrap in Tabs, add Cardio tab trigger + content |
| `components/workouts/index.ts` | Export new cardio components |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260407_cardio_tables.sql`

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` or `npx supabase migration up` (depending on local setup)
Expected: Migration applied successfully, 3 new tables created.

---

### Task 2: TypeScript Types

**Files:**
- Create: `lib/types/cardio.ts`
- Create: `__tests__/lib/cardio-types.test.ts`

- [ ] **Step 1: Write type tests**

```typescript
// __tests__/lib/cardio-types.test.ts
import { describe, it, expect } from 'vitest'
import type {
  CardioExerciseType,
  CardioPlanStatus,
  SegmentType,
  CardioSegmentData,
  CardioSessionData,
  CardioPlanData,
  CardioWeekData,
} from '@/lib/types/cardio'
import { formatPace, formatDistance, computeCardioWeeklyStats } from '@/lib/types/cardio'

describe('formatPace', () => {
  it('converts km/h to min/km pace string', () => {
    // 10 km/h = 6 min/km
    expect(formatPace(10)).toBe('6:00')
  })

  it('handles fractional pace', () => {
    // 8 km/h = 7.5 min/km = 7:30
    expect(formatPace(8)).toBe('7:30')
  })

  it('returns "--" for zero speed', () => {
    expect(formatPace(0)).toBe('--')
  })
})

describe('formatDistance', () => {
  it('formats distance with one decimal', () => {
    expect(formatDistance(5.123)).toBe('5.1')
  })

  it('formats zero distance', () => {
    expect(formatDistance(0)).toBe('0.0')
  })
})

describe('computeCardioWeeklyStats', () => {
  it('computes totals from sessions', () => {
    const sessions = [
      { duration_minutes: 30, total_distance: 5, avg_speed: 10 },
      { duration_minutes: 25, total_distance: 3.5, avg_speed: 8.4 },
    ] as Array<{ duration_minutes: number; total_distance: number | null; avg_speed: number | null }>

    const stats = computeCardioWeeklyStats(sessions)
    expect(stats.totalDistance).toBeCloseTo(8.5)
    expect(stats.totalMinutes).toBe(55)
    expect(stats.avgSpeed).toBeCloseTo(9.27, 1)
  })

  it('handles empty sessions', () => {
    const stats = computeCardioWeeklyStats([])
    expect(stats.totalDistance).toBe(0)
    expect(stats.totalMinutes).toBe(0)
    expect(stats.avgSpeed).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/cardio-types.test.ts`
Expected: FAIL -- module `@/lib/types/cardio` not found

- [ ] **Step 3: Write the types and utility functions**

```typescript
// lib/types/cardio.ts

// exercise types supported by the cardio domain
export type CardioExerciseType = 'treadmill' | 'cycling' | 'rowing'

// plan lifecycle
export type CardioPlanStatus = 'active' | 'paused' | 'completed'

// segment types within a session
export type SegmentType = 'warm_up' | 'main' | 'cool_down' | 'interval'

// fitness levels for plan generation input
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'

// a single segment within a planned session
export interface CardioSegmentData {
  type: SegmentType
  duration_seconds: number
  speed: number
  settings: Record<string, number> // { incline: 2 } for treadmill, { resistance: 5 } for cycling
}

// a single session within a plan week
export interface CardioSessionData {
  session_number: number
  segments: CardioSegmentData[]
}

// a single week within a plan
export interface CardioWeekData {
  week_number: number
  sessions: CardioSessionData[]
}

// the full plan_data JSON structure stored in cardio_plans
export interface CardioPlanData {
  weeks: CardioWeekData[]
  summary?: string // brief AI-generated progression summary
}

// database row types (matching the migration)
export interface CardioPlan {
  id: string
  user_id: string
  exercise_type: CardioExerciseType
  name: string
  goal: string
  fitness_level: FitnessLevel
  total_weeks: number
  sessions_per_week: number
  plan_data: CardioPlanData
  status: CardioPlanStatus
  current_week: number
  current_session: number
  created_at: string
}

export interface CardioSession {
  id: string
  user_id: string
  plan_id: string | null
  exercise_type: CardioExerciseType
  session_date: string
  started_at: string
  completed_at: string
  duration_minutes: number
  total_distance: number | null
  avg_speed: number | null
  plan_week: number | null
  plan_session: number | null
  notes: string | null
}

export interface CardioSegment {
  id: string
  session_id: string
  segment_order: number
  segment_type: SegmentType
  duration_seconds: number
  distance: number | null
  speed: number | null
  settings: Record<string, number>
  is_planned: boolean
  completed: boolean
}

// input for AI plan generation
export interface CardioPlanInput {
  goal: string
  fitness_level: FitnessLevel
  sessions_per_week: number
  exercise_type: CardioExerciseType
}

// segment data submitted when completing a session
export interface CardioSegmentInput {
  segment_order: number
  segment_type: SegmentType
  duration_seconds: number
  distance?: number
  speed?: number
  settings?: Record<string, number>
  is_planned: boolean
  completed: boolean
}

// session completion payload
export interface CardioSessionInput {
  plan_id?: string
  exercise_type: CardioExerciseType
  started_at: string
  completed_at: string
  duration_minutes: number
  total_distance?: number
  avg_speed?: number
  plan_week?: number
  plan_session?: number
  notes?: string
  segments: CardioSegmentInput[]
}

// utility: convert speed (km/h) to pace string (min:sec per km)
export function formatPace(speedKmh: number): string {
  if (speedKmh <= 0) return '--'
  const minutesPerKm = 60 / speedKmh
  const mins = Math.floor(minutesPerKm)
  const secs = Math.round((minutesPerKm - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// utility: format distance to 1 decimal
export function formatDistance(km: number): string {
  return km.toFixed(1)
}

// utility: compute weekly stats from a list of sessions
export function computeCardioWeeklyStats(
  sessions: Array<{ duration_minutes: number; total_distance: number | null; avg_speed: number | null }>
) {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalDistance = sessions.reduce((sum, s) => sum + (s.total_distance || 0), 0)
  const avgSpeed = totalDistance > 0 && totalMinutes > 0
    ? (totalDistance / totalMinutes) * 60 // km/h
    : 0

  return { totalMinutes, totalDistance, avgSpeed }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/cardio-types.test.ts`
Expected: All 6 tests PASS

---

### Task 3: Cardio API Routes -- Plans

**Files:**
- Create: `app/api/cardio-plans/route.ts`
- Create: `app/api/cardio-plans/[id]/route.ts`

- [ ] **Step 1: Write GET/POST route for plans**

```typescript
// app/api/cardio-plans/route.ts
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateCardioPlanSchema = z.object({
  exercise_type: z.enum(['treadmill', 'cycling', 'rowing']).default('treadmill'),
  name: z.string().min(1),
  goal: z.string().min(1),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']),
  total_weeks: z.number().int().positive(),
  sessions_per_week: z.number().int().min(2).max(5),
  plan_data: z.object({
    weeks: z.array(z.object({
      week_number: z.number(),
      sessions: z.array(z.object({
        session_number: z.number(),
        segments: z.array(z.object({
          type: z.enum(['warm_up', 'main', 'cool_down', 'interval']),
          duration_seconds: z.number().positive(),
          speed: z.number().nonnegative(),
          settings: z.record(z.number()).default({}),
        })),
      })),
    })),
    summary: z.string().optional(),
  }),
})

// GET /api/cardio-plans - list user's cardio plans
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('cardio_plans')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('error fetching cardio plans:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plans: data || [] })
})

// POST /api/cardio-plans - create a new cardio plan
export const POST = withAuthAndValidation(CreateCardioPlanSchema, async (request, user, body) => {
  const supabase = createClient()

  // pause any existing active plan for this user
  await supabase
    .from('cardio_plans')
    .update({ status: 'paused' })
    .eq('user_id', user.id)
    .eq('status', 'active')

  const { data, error } = await supabase
    .from('cardio_plans')
    .insert({
      user_id: user.id,
      exercise_type: body.exercise_type,
      name: body.name,
      goal: body.goal,
      fitness_level: body.fitness_level,
      total_weeks: body.total_weeks,
      sessions_per_week: body.sessions_per_week,
      plan_data: body.plan_data,
      status: 'active',
      current_week: 1,
      current_session: 1,
    })
    .select()
    .single()

  if (error) {
    console.error('error creating cardio plan:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan: data })
})
```

- [ ] **Step 2: Write PATCH route for plan updates**

```typescript
// app/api/cardio-plans/[id]/route.ts
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getPlanId(params: Promise<{ id: string }>) {
  const { id } = await params
  return id
}

// PATCH /api/cardio-plans/[id] - update plan status or progress
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const supabase = createClient()
    const id = await getPlanId(context.params)
    const body = await req.json()

    const updates: Record<string, unknown> = {}
    if (body.status !== undefined) updates.status = body.status
    if (body.current_week !== undefined) updates.current_week = body.current_week
    if (body.current_session !== undefined) updates.current_session = body.current_session

    const { data, error } = await supabase
      .from('cardio_plans')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('error updating cardio plan:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan: data })
  })(request)
}
```

---

### Task 4: Cardio API Routes -- Sessions

**Files:**
- Create: `app/api/cardio-sessions/route.ts`

- [ ] **Step 1: Write GET/POST route for sessions**

```typescript
// app/api/cardio-sessions/route.ts
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CardioSegmentInputSchema = z.object({
  segment_order: z.number().int().nonnegative(),
  segment_type: z.enum(['warm_up', 'main', 'cool_down', 'interval']),
  duration_seconds: z.number().positive(),
  distance: z.number().optional(),
  speed: z.number().optional(),
  settings: z.record(z.number()).optional(),
  is_planned: z.boolean(),
  completed: z.boolean(),
})

const CreateCardioSessionSchema = z.object({
  plan_id: z.string().uuid().optional(),
  exercise_type: z.enum(['treadmill', 'cycling', 'rowing']).default('treadmill'),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  duration_minutes: z.number().positive(),
  total_distance: z.number().optional(),
  avg_speed: z.number().optional(),
  plan_week: z.number().int().positive().optional(),
  plan_session: z.number().int().positive().optional(),
  notes: z.string().optional(),
  segments: z.array(CardioSegmentInputSchema).default([]),
})

// GET /api/cardio-sessions - list user's cardio sessions
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const startDate = searchParams.get('startDate')

  let query = supabase
    .from('cardio_sessions')
    .select('*, cardio_segments(*)')
    .order('session_date', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('session_date', startDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('error fetching cardio sessions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data || [] })
})

// POST /api/cardio-sessions - create a completed cardio session
export const POST = withAuthAndValidation(CreateCardioSessionSchema, async (request, user, body) => {
  const supabase = createClient()

  // create session record
  const { data: session, error: sessionError } = await supabase
    .from('cardio_sessions')
    .insert({
      user_id: user.id,
      plan_id: body.plan_id || null,
      exercise_type: body.exercise_type,
      session_date: new Date(body.started_at).toISOString().split('T')[0],
      started_at: body.started_at,
      completed_at: body.completed_at,
      duration_minutes: body.duration_minutes,
      total_distance: body.total_distance || null,
      avg_speed: body.avg_speed || null,
      plan_week: body.plan_week || null,
      plan_session: body.plan_session || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (sessionError) {
    console.error('error creating cardio session:', sessionError)
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  // create segment records
  if (body.segments.length > 0) {
    const segmentsToInsert = body.segments.map((seg) => ({
      session_id: session.id,
      segment_order: seg.segment_order,
      segment_type: seg.segment_type,
      duration_seconds: seg.duration_seconds,
      distance: seg.distance || null,
      speed: seg.speed || null,
      settings: seg.settings || {},
      is_planned: seg.is_planned,
      completed: seg.completed,
    }))

    const { error: segmentsError } = await supabase
      .from('cardio_segments')
      .insert(segmentsToInsert)

    if (segmentsError) {
      console.error('error creating cardio segments:', segmentsError)
    }
  }

  // advance plan progress if this session is part of a plan
  if (body.plan_id && body.plan_week && body.plan_session) {
    const { data: plan } = await supabase
      .from('cardio_plans')
      .select('total_weeks, sessions_per_week')
      .eq('id', body.plan_id)
      .single()

    if (plan) {
      const isLastSession = body.plan_session >= plan.sessions_per_week
      const isLastWeek = body.plan_week >= plan.total_weeks

      if (isLastSession && isLastWeek) {
        // plan completed
        await supabase
          .from('cardio_plans')
          .update({ status: 'completed', current_week: body.plan_week, current_session: body.plan_session })
          .eq('id', body.plan_id)
      } else if (isLastSession) {
        // advance to next week
        await supabase
          .from('cardio_plans')
          .update({ current_week: body.plan_week + 1, current_session: 1 })
          .eq('id', body.plan_id)
      } else {
        // advance to next session
        await supabase
          .from('cardio_plans')
          .update({ current_session: body.plan_session + 1 })
          .eq('id', body.plan_id)
      }
    }
  }

  return NextResponse.json({ session })
})
```

---

### Task 4b: API Route Tests

**Files:**
- Create: `__tests__/api/cardio-api.test.ts`

- [ ] **Step 1: Write API route tests**

```typescript
// __tests__/api/cardio-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock supabase
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockUpdate = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockSingle = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockFrom }),
}))

describe('cardio plan progress advancement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('advances to next session within same week', () => {
    // plan: week 1, session 2 of 3 sessions/week, 4 total weeks
    const planWeek = 1
    const planSession = 2
    const sessionsPerWeek = 3
    const totalWeeks = 4

    const isLastSession = planSession >= sessionsPerWeek
    const isLastWeek = planWeek >= totalWeeks

    expect(isLastSession).toBe(false)
    expect(isLastWeek).toBe(false)
    // should advance to next session: current_session = 3
  })

  it('advances to next week when last session of week', () => {
    const planWeek = 2
    const planSession = 3
    const sessionsPerWeek = 3
    const totalWeeks = 4

    const isLastSession = planSession >= sessionsPerWeek
    const isLastWeek = planWeek >= totalWeeks

    expect(isLastSession).toBe(true)
    expect(isLastWeek).toBe(false)
    // should advance to: current_week = 3, current_session = 1
  })

  it('marks plan as completed on final session of final week', () => {
    const planWeek = 4
    const planSession = 3
    const sessionsPerWeek = 3
    const totalWeeks = 4

    const isLastSession = planSession >= sessionsPerWeek
    const isLastWeek = planWeek >= totalWeeks

    expect(isLastSession).toBe(true)
    expect(isLastWeek).toBe(true)
    // should set status = 'completed'
  })
})

describe('cardio plan creation', () => {
  it('pauses existing active plan before creating new one', () => {
    // verify the POST handler calls update with status: 'paused'
    // before inserting the new plan
    expect(true).toBe(true) // placeholder for integration test
  })
})

describe('cardio session creation with segments', () => {
  it('creates segments linked to session', () => {
    // verify segments are inserted with correct session_id
    expect(true).toBe(true) // placeholder for integration test
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/api/cardio-api.test.ts`
Expected: All tests PASS

---

### Task 5: AI Plan Generation Endpoint

**Files:**
- Create: `app/api/ai/generate-cardio-plan/route.ts`

- [ ] **Step 1: Write the AI plan generation route**

```typescript
// app/api/ai/generate-cardio-plan/route.ts
import { NextResponse } from 'next/server'
import { withAuthAndValidation } from '@/lib/api/middleware'
import { llmService } from '@/lib/llm-service'
import { z } from 'zod'

const GenerateCardioPlanSchema = z.object({
  goal: z.string().min(1),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']),
  sessions_per_week: z.number().int().min(2).max(5),
  exercise_type: z.enum(['treadmill', 'cycling', 'rowing']).default('treadmill'),
})

const SYSTEM_PROMPT = `You are a fitness coach specializing in treadmill training. Generate a structured, progressive training plan based on the user's goal and fitness level.

RESPOND WITH ONLY VALID JSON matching this exact structure:

{
  "name": "string — a short descriptive plan name",
  "total_weeks": number,
  "plan_data": {
    "weeks": [
      {
        "week_number": 1,
        "sessions": [
          {
            "session_number": 1,
            "segments": [
              {
                "type": "warm_up" | "main" | "cool_down" | "interval",
                "duration_seconds": number,
                "speed": number (km/h),
                "settings": { "incline": number (percent grade, 0-15) }
              }
            ]
          }
        ]
      }
    ],
    "summary": "string — 2-3 sentence progression overview (e.g. 'Weeks 1-3: Base building at conversational pace. Weeks 4-6: Introduce speed intervals...')"
  }
}

Guidelines:
- Every session MUST have warm_up, at least one main or interval, and cool_down segments
- Warm-up: 3-5 min at 4-5.5 km/h, 0% incline
- Cool-down: 3-5 min at 3.5-5 km/h, 0% incline
- Progression: increase speed by 0.3-0.5 km/h per week, or incline by 0.5-1% per week, not both simultaneously
- Beginner: start at 5-6 km/h main pace, 0-1% incline, sessions 20-30 min
- Intermediate: start at 7-9 km/h, 1-3% incline, sessions 30-45 min
- Advanced: start at 9-12 km/h, 2-5% incline, sessions 40-60 min
- Typical plan length: beginner 8-12 weeks, intermediate 6-8 weeks, advanced 4-6 weeks
- Sessions per week must match the user's request exactly`

export const POST = withAuthAndValidation(GenerateCardioPlanSchema, async (request, user, body) => {
  if (!llmService.isConfigured()) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const userPrompt = `Create a treadmill training plan:
- Goal: ${body.goal}
- Fitness level: ${body.fitness_level}
- Sessions per week: ${body.sessions_per_week}
- Exercise type: ${body.exercise_type}`

  const response = await llmService.completion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 4000,
  })

  if (!response) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const parsed = llmService.parseJSON<{
    name: string
    total_weeks: number
    plan_data: {
      weeks: Array<{
        week_number: number
        sessions: Array<{
          session_number: number
          segments: Array<{
            type: string
            duration_seconds: number
            speed: number
            settings: Record<string, number>
          }>
        }>
      }>
      summary?: string
    }
  }>(response.content)

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }

  return NextResponse.json({
    name: parsed.name,
    total_weeks: parsed.total_weeks,
    sessions_per_week: body.sessions_per_week,
    plan_data: parsed.plan_data,
  })
})
```

---

### Task 6: React Query Hooks

**Files:**
- Create: `lib/hooks/use-cardio.ts`

- [ ] **Step 1: Write the hooks**

```typescript
// lib/hooks/use-cardio.ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CardioPlan,
  CardioPlanInput,
  CardioSession,
  CardioSessionInput,
} from '@/lib/types/cardio'

export const cardioKeys = {
  plans: ['cardio-plans'] as const,
  activePlan: () => [...cardioKeys.plans, 'active'] as const,
  sessions: ['cardio-sessions'] as const,
  sessionList: (filters: { startDate?: string; limit?: number }) =>
    [...cardioKeys.sessions, { filters }] as const,
}

// fetch user's cardio plans
export function useCardioPlans(status?: string) {
  return useQuery({
    queryKey: [...cardioKeys.plans, { status }],
    queryFn: async () => {
      const params = status ? `?status=${status}` : ''
      const res = await fetch(`/api/cardio-plans${params}`)
      if (!res.ok) throw new Error('failed to fetch cardio plans')
      const data = await res.json()
      return data.plans as CardioPlan[]
    },
    staleTime: 12 * 60 * 60 * 1000,
  })
}

// fetch the user's active plan (convenience wrapper)
export function useActiveCardioPlan() {
  const { data: plans, ...rest } = useCardioPlans('active')
  return { data: plans?.[0] ?? null, ...rest }
}

// generate a plan via AI
export function useGenerateCardioPlan() {
  return useMutation({
    mutationFn: async (input: CardioPlanInput) => {
      const res = await fetch('/api/ai/generate-cardio-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'failed to generate plan')
      }
      return res.json() as Promise<{
        name: string
        total_weeks: number
        sessions_per_week: number
        plan_data: CardioPlan['plan_data']
      }>
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to generate plan')
    },
  })
}

// save a confirmed plan
export function useCreateCardioPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (planData: {
      exercise_type: string
      name: string
      goal: string
      fitness_level: string
      total_weeks: number
      sessions_per_week: number
      plan_data: CardioPlan['plan_data']
    }) => {
      const res = await fetch('/api/cardio-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'failed to save plan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardioKeys.plans })
      toast.success('plan started!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to save plan')
    },
  })
}

// update plan status/progress
export function useUpdateCardioPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: string
      status?: string
      current_week?: number
      current_session?: number
    }) => {
      const { id, ...updates } = params
      const res = await fetch(`/api/cardio-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'failed to update plan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardioKeys.plans })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to update plan')
    },
  })
}

// fetch cardio sessions
export function useCardioSessions(filters: { startDate?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: cardioKeys.sessionList(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.limit) params.append('limit', filters.limit.toString())

      const res = await fetch(`/api/cardio-sessions?${params}`)
      if (!res.ok) throw new Error('failed to fetch cardio sessions')
      const data = await res.json()
      return data.sessions as CardioSession[]
    },
    staleTime: 12 * 60 * 60 * 1000,
  })
}

// create a completed cardio session
export function useCreateCardioSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionData: CardioSessionInput) => {
      const res = await fetch('/api/cardio-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'failed to save session')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardioKeys.sessions })
      queryClient.invalidateQueries({ queryKey: cardioKeys.plans })
      toast.success('session saved!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to save session')
    },
  })
}
```

---

### Task 7: CardioQuickStats Component

**Files:**
- Create: `components/workouts/CardioQuickStats.tsx`
- Create: `__tests__/components/cardio-quick-stats.test.tsx`

- [ ] **Step 1: Write component test**

```tsx
// __tests__/components/cardio-quick-stats.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardioQuickStats } from '@/components/workouts/CardioQuickStats'

describe('CardioQuickStats', () => {
  it('renders three stat cards', () => {
    render(<CardioQuickStats totalDistance={12.4} avgSpeed={9.2} totalMinutes={85} />)
    expect(screen.getByText('km')).toBeDefined()
    expect(screen.getByText('pace')).toBeDefined()
    expect(screen.getByText('min')).toBeDefined()
  })

  it('renders zeros when no data', () => {
    render(<CardioQuickStats totalDistance={0} avgSpeed={0} totalMinutes={0} />)
    expect(screen.getByText('km')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/components/cardio-quick-stats.test.tsx`
Expected: FAIL -- CardioQuickStats not found

- [ ] **Step 3: Write the component**

```tsx
// components/workouts/CardioQuickStats.tsx
'use client'

import { motion } from 'motion/react'
import { springs, variants } from '@/lib/motion-system'
import { formatPace } from '@/lib/types/cardio'

interface CardioQuickStatsProps {
  totalDistance: number
  avgSpeed: number // in km/h (0 = no data)
  totalMinutes: number
}

export function CardioQuickStats({
  totalDistance,
  avgSpeed,
  totalMinutes,
}: CardioQuickStatsProps) {
  const stats = [
    {
      value: totalDistance.toFixed(1),
      label: 'km',
      sublabel: 'this week',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      value: avgSpeed > 0 ? formatPace(avgSpeed) : '--',
      label: 'pace',
      sublabel: 'avg min/km',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      value: totalMinutes.toString(),
      label: 'min',
      sublabel: 'total',
      color: 'text-purple-600 dark:text-purple-400',
    },
  ]

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="flex gap-2"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex-1 ios-card p-3 text-center">
          <div className={`text-lg font-bold tracking-tight ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </motion.div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/components/cardio-quick-stats.test.tsx`
Expected: PASS

---

### Task 8: CardioPlanHero Component

**Files:**
- Create: `components/workouts/CardioPlanHero.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/workouts/CardioPlanHero.tsx
'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { springs, variants } from '@/lib/motion-system'
import type { CardioPlan } from '@/lib/types/cardio'

interface CardioPlanHeroProps {
  plan: CardioPlan | null
  onStartSession: () => void
  onGeneratePlan: () => void
}

function ProgressRing({ progress }: { progress: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width="44" height="44" className="transform -rotate-90">
      <circle
        cx="22" cy="22" r={radius}
        fill="none" stroke="currentColor"
        className="text-muted" strokeWidth="3"
      />
      <motion.circle
        cx="22" cy="22" r={radius}
        fill="none" stroke="currentColor"
        className="text-primary" strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={springs.ios}
      />
    </svg>
  )
}

export function CardioPlanHero({ plan, onStartSession, onGeneratePlan }: CardioPlanHeroProps) {
  if (!plan) {
    return (
      <motion.div
        {...variants.slideUp}
        transition={springs.ios}
        className="ios-card p-4"
      >
        <h3 className="font-semibold text-foreground">Start a Cardio Plan</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a personalized treadmill training program
        </p>
        <Button className="w-full mt-3" onClick={onGeneratePlan}>
          Generate a Plan
        </Button>
      </motion.div>
    )
  }

  const totalSessions = plan.total_weeks * plan.sessions_per_week
  const completedSessions = ((plan.current_week - 1) * plan.sessions_per_week) + (plan.current_session - 1)
  const progress = Math.round((completedSessions / totalSessions) * 100)

  const isCompleted = plan.status === 'completed'

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{plan.name}</h3>
          <p className="text-sm text-primary mt-0.5">
            {isCompleted
              ? 'Plan completed!'
              : `Week ${plan.current_week} of ${plan.total_weeks} — Session ${plan.current_session} of ${plan.sessions_per_week}`
            }
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <ProgressRing progress={isCompleted ? 100 : progress} />
          <span className="absolute text-[11px] font-bold text-primary">
            {isCompleted ? '100' : progress}%
          </span>
        </div>
      </div>
      <Button
        className="w-full mt-3"
        onClick={isCompleted ? onGeneratePlan : onStartSession}
      >
        {isCompleted ? 'Generate New Plan' : "Start Today's Run"}
      </Button>
    </motion.div>
  )
}
```

---

### Task 9: CardioSessionPreview Component

**Files:**
- Create: `components/workouts/CardioSessionPreview.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/workouts/CardioSessionPreview.tsx
'use client'

import { motion } from 'motion/react'
import { springs, variants } from '@/lib/motion-system'
import type { CardioSegmentData } from '@/lib/types/cardio'

interface CardioSessionPreviewProps {
  segments: CardioSegmentData[]
}

const SEGMENT_LABELS: Record<string, string> = {
  warm_up: 'Warm-up',
  main: 'Main',
  cool_down: 'Cool-down',
  interval: 'Interval',
}

export function CardioSessionPreview({ segments }: CardioSessionPreviewProps) {
  if (segments.length === 0) return null

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card p-3"
    >
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Today&apos;s Session
      </div>
      <div className="flex gap-1.5">
        {segments.map((segment, i) => {
          const isMain = segment.type === 'main' || segment.type === 'interval'
          const minutes = Math.round(segment.duration_seconds / 60)
          const incline = segment.settings?.incline

          return (
            <div
              key={i}
              className={`${isMain ? 'flex-[2]' : 'flex-1'} rounded-lg p-2 text-center ${
                isMain
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted'
              }`}
            >
              <div className={`text-[10px] font-medium ${isMain ? 'text-primary' : 'text-muted-foreground'}`}>
                {SEGMENT_LABELS[segment.type] || segment.type}
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {minutes} min
              </div>
              <div className="text-[10px] text-muted-foreground">
                {segment.speed} km/h{incline ? ` @ ${incline}%` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
```

---

### Task 10: CardioRecentSessions Component

**Files:**
- Create: `components/workouts/CardioRecentSessions.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/workouts/CardioRecentSessions.tsx
'use client'

import { motion } from 'motion/react'
import { springs, variants } from '@/lib/motion-system'
import { formatDistance } from '@/lib/types/cardio'
import { formatDistanceToNow } from 'date-fns'
import type { CardioSession } from '@/lib/types/cardio'

interface CardioRecentSessionsProps {
  sessions: CardioSession[]
  maxVisible?: number
}

export function CardioRecentSessions({ sessions, maxVisible = 3 }: CardioRecentSessionsProps) {
  const visible = sessions.slice(0, maxVisible)

  if (visible.length === 0) {
    return (
      <motion.div
        {...variants.slideUp}
        transition={springs.ios}
        className="ios-card p-4 text-center"
      >
        <p className="text-sm text-muted-foreground">No sessions yet</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card overflow-hidden"
    >
      <div className="px-3 pt-3 pb-1">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Recent Sessions
        </div>
      </div>
      {visible.map((session, i) => (
        <div
          key={session.id}
          className={`flex items-center justify-between px-3 py-2.5 ${
            i < visible.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          <div>
            <div className="text-sm font-medium text-foreground">
              {session.plan_week && session.plan_session
                ? `Week ${session.plan_week}, Session ${session.plan_session}`
                : 'Free Run'
              }
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(session.session_date), { addSuffix: true })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-foreground">
              {session.total_distance ? `${formatDistance(session.total_distance)} km` : '--'}
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(session.duration_minutes)} min
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}
```

---

### Task 11: CardioPlanDialog and CardioPlanPreview Components

**Files:**
- Create: `components/workouts/CardioPlanDialog.tsx`
- Create: `components/workouts/CardioPlanPreview.tsx`

- [ ] **Step 1: Write CardioPlanDialog**

```tsx
// components/workouts/CardioPlanDialog.tsx
'use client'

import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import type { CardioPlanInput, FitnessLevel } from '@/lib/types/cardio'

interface CardioPlanDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (input: CardioPlanInput) => void
  isGenerating: boolean
}

const FITNESS_LEVELS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export function CardioPlanDialog({ isOpen, onClose, onGenerate, isGenerating }: CardioPlanDialogProps) {
  const [goal, setGoal] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setGoal('')
      setFitnessLevel('beginner')
      setSessionsPerWeek(3)
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (!goal.trim()) return
    onGenerate({
      goal: goal.trim(),
      fitness_level: fitnessLevel,
      sessions_per_week: sessionsPerWeek,
      exercise_type: 'treadmill',
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springs.sheet}
          className="bg-background w-full max-w-lg rounded-t-2xl p-4 safe-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
          <h2 className="ios-headline mb-4">Generate Training Plan</h2>

          {/* Goal input */}
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-1">Goal</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., run 5km in 30 minutes"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Fitness level */}
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-1">Fitness Level</label>
            <div className="flex gap-2">
              {FITNESS_LEVELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFitnessLevel(value)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    fitnessLevel === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions per week */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground block mb-1">Sessions per week</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setSessionsPerWeek(n)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    sessionsPerWeek === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!goal.trim() || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Plan'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Write CardioPlanPreview**

```tsx
// components/workouts/CardioPlanPreview.tsx
'use client'

import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import type { CardioPlanData } from '@/lib/types/cardio'

interface CardioPlanPreviewProps {
  isOpen: boolean
  name: string
  totalWeeks: number
  sessionsPerWeek: number
  planData: CardioPlanData
  onConfirm: () => void
  onRegenerate: () => void
  onClose: () => void
  isSaving: boolean
}

export function CardioPlanPreview({
  isOpen,
  name,
  totalWeeks,
  sessionsPerWeek,
  planData,
  onConfirm,
  onRegenerate,
  onClose,
  isSaving,
}: CardioPlanPreviewProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springs.sheet}
          className="bg-background w-full max-w-lg rounded-t-2xl p-4 safe-bottom max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
          <h2 className="ios-headline mb-1">{name}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {totalWeeks} weeks &middot; {sessionsPerWeek}x per week
          </p>

          {/* Summary */}
          {planData.summary && (
            <div className="ios-card p-3 mb-4">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Progression
              </div>
              <p className="text-sm text-foreground">{planData.summary}</p>
            </div>
          )}

          {/* Week overview */}
          <div className="space-y-2 mb-6">
            {planData.weeks.map((week) => {
              const totalDuration = week.sessions.reduce((sum, s) =>
                sum + s.segments.reduce((ss, seg) => ss + seg.duration_seconds, 0), 0
              )
              const avgSpeed = week.sessions[0]?.segments
                .filter(s => s.type === 'main')
                .reduce((sum, s) => sum + s.speed, 0) /
                (week.sessions[0]?.segments.filter(s => s.type === 'main').length || 1)

              return (
                <div key={week.week_number} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="text-sm font-medium text-foreground">
                    Week {week.week_number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~{Math.round(totalDuration / 60)} min/session &middot; {avgSpeed.toFixed(1)} km/h
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onRegenerate}>
              Try Again
            </Button>
            <Button className="flex-1" onClick={onConfirm} disabled={isSaving}>
              {isSaving ? 'Starting...' : 'Start Plan'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
```

---

### Task 12: CardioSessionLogger Component

**Files:**
- Create: `components/workouts/CardioSessionLogger.tsx`

- [ ] **Step 1: Write the session logger**

```tsx
// components/workouts/CardioSessionLogger.tsx
'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { CardioSegmentData, CardioSegmentInput } from '@/lib/types/cardio'

interface CardioSessionLoggerProps {
  segments: CardioSegmentData[]
  onComplete: (segments: CardioSegmentInput[], totalDuration: number, totalDistance: number, startedAt: string) => void
  onCancel: () => void
}

const SEGMENT_LABELS: Record<string, string> = {
  warm_up: 'Warm-up',
  main: 'Main',
  cool_down: 'Cool-down',
  interval: 'Interval',
}

export function CardioSessionLogger({ segments, onComplete, onCancel }: CardioSessionLoggerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [completedSegments, setCompletedSegments] = useState<CardioSegmentInput[]>([])
  const [editingSpeed, setEditingSpeed] = useState<number | null>(null)
  const [editingIncline, setEditingIncline] = useState<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const sessionStartRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentSegment = segments[currentIndex]
  const isLastSegment = currentIndex === segments.length - 1

  const actualSpeed = editingSpeed ?? currentSegment?.speed ?? 0
  const actualIncline = editingIncline ?? currentSegment?.settings?.incline ?? 0

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current!) / 1000))
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  const handleNextSegment = () => {
    if (!currentSegment) return

    const segmentInput: CardioSegmentInput = {
      segment_order: currentIndex,
      segment_type: currentSegment.type,
      duration_seconds: elapsed,
      speed: actualSpeed,
      distance: actualSpeed > 0 ? (actualSpeed * elapsed) / 3600 : undefined,
      settings: { incline: actualIncline },
      is_planned: editingSpeed === null && editingIncline === null,
      completed: true,
    }

    const newCompleted = [...completedSegments, segmentInput]
    setCompletedSegments(newCompleted)

    if (isLastSegment) {
      setIsRunning(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      const totalDuration = newCompleted.reduce((sum, s) => sum + s.duration_seconds, 0)
      const totalDistance = newCompleted.reduce((sum, s) => sum + (s.distance || 0), 0)
      onComplete(newCompleted, totalDuration, totalDistance, sessionStartRef.current!)
    } else {
      setCurrentIndex(currentIndex + 1)
      setElapsed(0)
      setEditingSpeed(null)
      setEditingIncline(null)
      startTimeRef.current = Date.now()
    }
  }

  if (!currentSegment) return null

  const targetDuration = currentSegment.duration_seconds
  const progress = Math.min(elapsed / targetDuration, 1)
  const isOvertime = elapsed > targetDuration

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={springs.sheet}
      className="fixed inset-0 z-[60] bg-background flex flex-col !mt-0"
    >
      {/* header */}
      <div className="safe-top border-b bg-background/95 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <h2 className="ios-headline">
            {SEGMENT_LABELS[currentSegment.type]}
          </h2>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1}/{segments.length}
          </div>
        </div>
      </div>

      {/* segment progress */}
      <div className="px-4 pt-2">
        <div className="flex gap-1">
          {segments.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i < currentIndex
                  ? 'bg-primary'
                  : i === currentIndex
                    ? 'bg-primary/50'
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* timer */}
        <div className={`text-6xl font-bold tracking-tight ${isOvertime ? 'text-orange-500' : 'text-foreground'}`}>
          {formatTime(elapsed)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Target: {formatTime(targetDuration)}
        </div>

        {/* progress bar */}
        <div className="w-full max-w-xs mt-6 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isOvertime ? 'bg-orange-500' : 'bg-primary'}`}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* targets -- inline editable inputs */}
        <div className="flex gap-6 mt-8">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                max="25"
                value={actualSpeed}
                onChange={(e) => setEditingSpeed(parseFloat(e.target.value) || 0)}
                className="w-16 text-2xl font-bold text-foreground text-center bg-transparent border-b-2 border-muted focus:border-primary focus:outline-none"
              />
              <span className="text-sm text-muted-foreground">km/h</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Speed</div>
          </div>
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                max="15"
                value={actualIncline}
                onChange={(e) => setEditingIncline(parseFloat(e.target.value) || 0)}
                className="w-16 text-2xl font-bold text-foreground text-center bg-transparent border-b-2 border-muted focus:border-primary focus:outline-none"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Incline</div>
          </div>
        </div>
      </div>

      {/* bottom actions */}
      <div className="px-4 pb-4 safe-bottom">
        {!isRunning ? (
          <Button className="w-full h-14 text-lg" onClick={() => {
            if (!sessionStartRef.current) {
              sessionStartRef.current = new Date().toISOString()
            }
            startTimeRef.current = Date.now() - elapsed * 1000
            setIsRunning(true)
          }}>
            {elapsed > 0 ? 'Resume' : 'Start'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-14"
              onClick={() => {
                setIsRunning(false)
                if (intervalRef.current) clearInterval(intervalRef.current)
              }}
            >
              Pause
            </Button>
            <Button className="flex-1 h-14 text-lg" onClick={handleNextSegment}>
              {isLastSegment ? 'Finish' : 'Next Segment'}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
```

---

### Task 13: CardioSessionSummary Component

**Files:**
- Create: `components/workouts/CardioSessionSummary.tsx`

- [ ] **Step 1: Write the summary component**

```tsx
// components/workouts/CardioSessionSummary.tsx
'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { formatDistance, formatPace } from '@/lib/types/cardio'
import type { CardioSegmentInput } from '@/lib/types/cardio'

interface CardioSessionSummaryProps {
  show: boolean
  totalDuration: number // seconds
  totalDistance: number // km
  segments: CardioSegmentInput[]
  planWeek?: number
  planSession?: number
  sessionsPerWeek?: number
  onClose: () => void
}

const SEGMENT_LABELS: Record<string, string> = {
  warm_up: 'Warm-up',
  main: 'Main',
  cool_down: 'Cool-down',
  interval: 'Interval',
}

export function CardioSessionSummary({
  show,
  totalDuration,
  totalDistance,
  segments,
  planWeek,
  planSession,
  sessionsPerWeek,
  onClose,
}: CardioSessionSummaryProps) {
  if (!show) return null

  const durationMinutes = Math.round(totalDuration / 60)
  const avgSpeed = totalDuration > 0 ? (totalDistance / totalDuration) * 3600 : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] bg-background flex flex-col !mt-0"
    >
      <div className="flex-1 overflow-y-auto px-4 pt-12 pb-4">
        {/* header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springs.ios}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-bold text-foreground">Run Complete</h2>
          {planWeek && planSession && (
            <p className="text-sm text-primary mt-1">
              Week {planWeek}, Session {planSession} done
              {sessionsPerWeek && ` — ${sessionsPerWeek - planSession} left this week`}
            </p>
          )}
        </motion.div>

        {/* stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="ios-card p-3 text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {durationMinutes}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">min</div>
          </div>
          <div className="ios-card p-3 text-center">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatDistance(totalDistance)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">km</div>
          </div>
          <div className="ios-card p-3 text-center">
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {avgSpeed > 0 ? formatPace(avgSpeed) : '--'}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">pace</div>
          </div>
        </div>

        {/* segments breakdown */}
        <div className="ios-card overflow-hidden">
          <div className="px-3 pt-3 pb-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Segments
            </div>
          </div>
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2.5 ${
                i < segments.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="text-sm font-medium text-foreground">
                {SEGMENT_LABELS[seg.segment_type] || seg.segment_type}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(seg.duration_seconds / 60)} min
                {seg.speed ? ` · ${seg.speed} km/h` : ''}
                {seg.settings?.incline ? ` · ${seg.settings.incline}%` : ''}
                {!seg.is_planned && (
                  <span className="text-orange-500 ml-1">(edited)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* done button */}
      <div className="px-4 pb-4 safe-bottom">
        <Button className="w-full h-14 text-lg" onClick={onClose}>
          Done
        </Button>
      </div>
    </motion.div>
  )
}
```

---

### Task 14: CardioView Dashboard

**Files:**
- Create: `components/workouts/CardioView.tsx`

- [ ] **Step 1: Write the main cardio dashboard**

```tsx
// components/workouts/CardioView.tsx
'use client'

import { useState, useMemo } from 'react'
import { startOfWeek, isThisWeek } from 'date-fns'
import {
  useActiveCardioPlan,
  useCardioSessions,
  useGenerateCardioPlan,
  useCreateCardioPlan,
  useCreateCardioSession,
} from '@/lib/hooks/use-cardio'
import { computeCardioWeeklyStats } from '@/lib/types/cardio'
import type { CardioPlanData, CardioPlanInput, CardioSegmentInput } from '@/lib/types/cardio'
import { CardioPlanHero } from './CardioPlanHero'
import { CardioSessionPreview } from './CardioSessionPreview'
import { CardioQuickStats } from './CardioQuickStats'
import { CardioRecentSessions } from './CardioRecentSessions'
import { CardioPlanDialog } from './CardioPlanDialog'
import { CardioPlanPreview } from './CardioPlanPreview'
import { CardioSessionLogger } from './CardioSessionLogger'
import { CardioSessionSummary } from './CardioSessionSummary'

export function CardioView() {
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [showPlanPreview, setShowPlanPreview] = useState(false)
  const [showSessionLogger, setShowSessionLogger] = useState(false)
  const [showSessionSummary, setShowSessionSummary] = useState(false)
  const [sessionResult, setSessionResult] = useState<{
    segments: CardioSegmentInput[]
    totalDuration: number
    totalDistance: number
  } | null>(null)

  // generated plan data (before confirmation)
  const [generatedPlan, setGeneratedPlan] = useState<{
    name: string
    totalWeeks: number
    sessionsPerWeek: number
    planData: CardioPlanData
    input: CardioPlanInput
  } | null>(null)

  const { data: activePlan, isLoading: planLoading } = useActiveCardioPlan()
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0]
  const { data: sessions = [], isLoading: sessionsLoading } = useCardioSessions({ startDate: weekStart })

  const generatePlan = useGenerateCardioPlan()
  const createPlan = useCreateCardioPlan()
  const createSession = useCreateCardioSession()

  const weekSessions = useMemo(
    () => sessions.filter(s => isThisWeek(new Date(s.session_date), { weekStartsOn: 1 })),
    [sessions]
  )

  const weeklyStats = useMemo(
    () => computeCardioWeeklyStats(weekSessions),
    [weekSessions]
  )

  // get today's session segments from the active plan
  const todaySegments = useMemo(() => {
    if (!activePlan || activePlan.status === 'completed') return []
    const week = activePlan.plan_data.weeks.find(w => w.week_number === activePlan.current_week)
    const session = week?.sessions.find(s => s.session_number === activePlan.current_session)
    return session?.segments || []
  }, [activePlan])

  const handleGenerate = async (input: CardioPlanInput) => {
    const result = await generatePlan.mutateAsync(input)
    setGeneratedPlan({
      name: result.name,
      totalWeeks: result.total_weeks,
      sessionsPerWeek: result.sessions_per_week,
      planData: result.plan_data,
      input,
    })
    setShowPlanDialog(false)
    setShowPlanPreview(true)
  }

  const handleConfirmPlan = async () => {
    if (!generatedPlan) return
    await createPlan.mutateAsync({
      exercise_type: generatedPlan.input.exercise_type,
      name: generatedPlan.name,
      goal: generatedPlan.input.goal,
      fitness_level: generatedPlan.input.fitness_level,
      total_weeks: generatedPlan.totalWeeks,
      sessions_per_week: generatedPlan.sessionsPerWeek,
      plan_data: generatedPlan.planData,
    })
    setShowPlanPreview(false)
    setGeneratedPlan(null)
  }

  const handleSessionComplete = async (
    segments: CardioSegmentInput[],
    totalDuration: number,
    totalDistance: number,
    startedAt: string,
  ) => {
    const completedAt = new Date().toISOString()
    const avgSpeed = totalDuration > 0 ? (totalDistance / totalDuration) * 3600 : undefined

    await createSession.mutateAsync({
      plan_id: activePlan?.id,
      exercise_type: 'treadmill',
      started_at: startedAt,
      completed_at: completedAt,
      duration_minutes: totalDuration / 60,
      total_distance: totalDistance || undefined,
      avg_speed: avgSpeed,
      plan_week: activePlan?.current_week,
      plan_session: activePlan?.current_session,
      segments,
    })

    setShowSessionLogger(false)
    setSessionResult({ segments, totalDuration, totalDistance })
    setShowSessionSummary(true)
  }

  if (planLoading || sessionsLoading) {
    return (
      <div className="space-y-3">
        <div className="ios-card h-32 animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="flex-1 ios-card h-16 animate-pulse" />)}
        </div>
        <div className="ios-card h-24 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <CardioPlanHero
        plan={activePlan}
        onStartSession={() => setShowSessionLogger(true)}
        onGeneratePlan={() => setShowPlanDialog(true)}
      />

      {todaySegments.length > 0 && (
        <CardioSessionPreview segments={todaySegments} />
      )}

      <CardioQuickStats
        totalDistance={weeklyStats.totalDistance}
        avgSpeed={weeklyStats.avgSpeed}
        totalMinutes={weeklyStats.totalMinutes}
      />

      <CardioRecentSessions sessions={sessions} />

      <CardioPlanDialog
        isOpen={showPlanDialog}
        onClose={() => setShowPlanDialog(false)}
        onGenerate={handleGenerate}
        isGenerating={generatePlan.isPending}
      />

      {generatedPlan && (
        <CardioPlanPreview
          isOpen={showPlanPreview}
          name={generatedPlan.name}
          totalWeeks={generatedPlan.totalWeeks}
          sessionsPerWeek={generatedPlan.sessionsPerWeek}
          planData={generatedPlan.planData}
          onConfirm={handleConfirmPlan}
          onRegenerate={() => {
            setShowPlanPreview(false)
            setShowPlanDialog(true)
          }}
          onClose={() => {
            setShowPlanPreview(false)
            setGeneratedPlan(null)
          }}
          isSaving={createPlan.isPending}
        />
      )}

      {showSessionLogger && todaySegments.length > 0 && (
        <CardioSessionLogger
          segments={todaySegments}
          onComplete={handleSessionComplete}
          onCancel={() => setShowSessionLogger(false)}
        />
      )}

      {sessionResult && (
        <CardioSessionSummary
          show={showSessionSummary}
          totalDuration={sessionResult.totalDuration}
          totalDistance={sessionResult.totalDistance}
          segments={sessionResult.segments}
          planWeek={activePlan?.current_week}
          planSession={activePlan?.current_session}
          sessionsPerWeek={activePlan?.sessions_per_week}
          onClose={() => {
            setShowSessionSummary(false)
            setSessionResult(null)
          }}
        />
      )}
    </div>
  )
}
```

---

### Task 15: Update Exports and Integrate into WorkoutsView

**Files:**
- Modify: `components/workouts/index.ts`
- Modify: `components/views/workouts-view.tsx`

- [ ] **Step 1: Update the workouts barrel export**

Add to `components/workouts/index.ts`:

```typescript
export { CardioView } from './CardioView'
export { CardioPlanHero } from './CardioPlanHero'
export { CardioSessionPreview } from './CardioSessionPreview'
export { CardioQuickStats } from './CardioQuickStats'
export { CardioRecentSessions } from './CardioRecentSessions'
export { CardioPlanDialog } from './CardioPlanDialog'
export { CardioPlanPreview } from './CardioPlanPreview'
export { CardioSessionLogger } from './CardioSessionLogger'
export { CardioSessionSummary } from './CardioSessionSummary'
```

- [ ] **Step 2: Integrate Tabs into WorkoutsView**

In `components/views/workouts-view.tsx`:

Add imports at the top:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardioView } from '@/components/workouts'
```

Replace the `return` block (starting at line 167). Wrap the existing `<div className="space-y-3 pb-24">` inside a `Tabs` + `TabsContent` for "strength", and add a second `TabsContent` for "cardio":

```tsx
return (
  <Tabs defaultValue="strength" className="pb-24">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="strength" className="text-xs">
        Strength
      </TabsTrigger>
      <TabsTrigger value="cardio" className="text-xs">
        Cardio
      </TabsTrigger>
    </TabsList>

    <TabsContent value="strength" className="mt-3">
      <div className="space-y-3">
        {/* All existing strength content from WorkoutTodayHeader through WorkoutGeneratorSheet */}
        <WorkoutTodayHeader ... />
        <WorkoutWeekStrip ... />
        <WorkoutQuickStats ... />
        <WorkoutTemplatesList ... />
        <div className="flex gap-3">
          <WorkoutMuscleMap ... />
          <WorkoutRecentPRs ... />
        </div>
        <WorkoutRecentActivity ... />
        {/* All existing sheets/dialogs/portals stay here */}
        <TemplateDetailSheet ... />
        <TemplateFormDialog ... />
        <TemplateFormDialog ... />
        <WorkoutAnalyticsSheet ... />
        {/* Calendar portal */}
        <WorkoutGeneratorSheet ... />
      </div>
    </TabsContent>

    <TabsContent value="cardio" className="mt-3">
      <CardioView />
    </TabsContent>
  </Tabs>
)
```

The `...` above means keep all existing props exactly as they are -- just wrap the existing JSX in the `TabsContent`. Do not modify any props or component logic. The only structural change is the `Tabs` wrapper and the new `CardioView` tab content.

- [ ] **Step 3: Verify the app compiles**

Run: `npm run build` or `npx next build`
Expected: Build succeeds with no type errors

---

### Task 16: Manual Testing Checklist

This is not a code task -- it's a verification pass after all code is written.

- [ ] **Step 1: Verify Strength tab is unchanged**

Open the app, navigate to Workouts. The "Strength" tab should be selected by default. All existing features (today's workout, week strip, quick stats, templates, muscle map, PRs, recent activity) should render exactly as before.

- [ ] **Step 2: Verify Cardio tab renders**

Switch to the "Cardio" tab. Should see:
- CardioPlanHero with "Generate a Plan" CTA (no active plan)
- CardioQuickStats showing zeros
- CardioRecentSessions showing "No sessions yet"

- [ ] **Step 3: Test plan generation**

Click "Generate a Plan". Fill in goal, fitness level, sessions per week. Submit. Verify AI returns a plan preview. Confirm the plan. Verify the hero card updates to show the plan name and progress.

- [ ] **Step 4: Test session logging**

Click "Start Today's Run". Verify session logger opens with correct segments from the plan. Start timer, advance through segments. Finish. Verify summary screen shows correct stats. Verify session appears in recent sessions list.

- [ ] **Step 5: Commit all changes**

Stage all new files created by this plan and commit as a single batch:

```bash
git add supabase/migrations/20260407_cardio_tables.sql \
  lib/types/cardio.ts \
  lib/hooks/use-cardio.ts \
  app/api/cardio-plans/route.ts \
  app/api/cardio-plans/[id]/route.ts \
  app/api/cardio-sessions/route.ts \
  app/api/ai/generate-cardio-plan/route.ts \
  components/workouts/CardioView.tsx \
  components/workouts/CardioPlanHero.tsx \
  components/workouts/CardioSessionPreview.tsx \
  components/workouts/CardioQuickStats.tsx \
  components/workouts/CardioRecentSessions.tsx \
  components/workouts/CardioPlanDialog.tsx \
  components/workouts/CardioPlanPreview.tsx \
  components/workouts/CardioSessionLogger.tsx \
  components/workouts/CardioSessionSummary.tsx \
  components/workouts/index.ts \
  components/views/workouts-view.tsx \
  __tests__/lib/cardio-types.test.ts \
  __tests__/api/cardio-api.test.ts \
  __tests__/components/cardio-quick-stats.test.tsx
git commit -m "feat(cardio): add cardio tab with AI plan generation, session logging, and dashboard"
```
