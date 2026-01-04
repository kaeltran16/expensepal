# WORKOUT_IMPLEMENTATION_PLAN.md

> **Created:** 2025-12-01
> **Project:** ExpensePal - Workout Tracking Feature
> **Inspired By:** Planfit.ai (minus social features)
> **Estimated Timeline:** 3-4 weeks

---

## 📋 Executive Summary

This plan adds comprehensive workout tracking functionality to ExpensePal, transforming it into a combined finance + fitness tracker. The implementation follows the existing architecture (TanStack Query, custom hooks, mobile-first PWA) and maintains the iOS-native feel.

### Core Features
1. **AI-Powered Workout Plans** - Personalized routines based on goals and equipment
2. **Exercise Library** - 200+ exercises with video/GIF demonstrations
3. **Workout Logging** - Set/rep/weight tracking with rest timers
4. **Progress Analytics** - Strength gains, volume tracking, personal records
5. **Smart Recommendations** - Progressive overload, alternative exercises
6. **Workout Templates** - Pre-built programs and custom routines

---

## 🎯 Feature Breakdown (Planfit.ai Analysis)

### Must-Have Features
- ✅ Custom workout plan generation
- ✅ Exercise library with demonstrations
- ✅ Workout logging (sets, reps, weight, rest)
- ✅ Progress tracking and analytics
- ✅ Progressive overload recommendations
- ✅ Alternative exercise suggestions
- ✅ Rest timer during workouts
- ✅ Personal record tracking
- ✅ Workout history calendar

### Won't Implement (Social Features)
- ❌ Social feed/sharing
- ❌ Community challenges
- ❌ Friend connections
- ❌ Public profiles

---

## 🗄️ Database Schema

### New Tables

```sql
-- User workout profile
CREATE TABLE workout_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User preferences
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  primary_goal TEXT CHECK (primary_goal IN ('strength', 'hypertrophy', 'endurance', 'general_fitness')),
  training_frequency INT CHECK (training_frequency BETWEEN 1 AND 7),
  session_duration INT, -- minutes
  available_equipment TEXT[], -- ['barbell', 'dumbbell', 'machine', etc]
  training_location TEXT CHECK (training_location IN ('gym', 'home', 'both')),

  -- Physical stats
  weight DECIMAL(5, 2),
  height DECIMAL(5, 2),
  age INT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Exercise library
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT[],

  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility', 'sports')),
  primary_muscles TEXT[] NOT NULL, -- ['chest', 'triceps']
  secondary_muscles TEXT[],
  equipment TEXT[] NOT NULL, -- ['barbell', 'bench']
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),

  -- Media
  video_url TEXT,
  gif_url TEXT,
  thumbnail_url TEXT,

  -- Metadata
  is_compound BOOLEAN DEFAULT false,
  is_unilateral BOOLEAN DEFAULT false, -- single arm/leg
  force_type TEXT CHECK (force_type IN ('push', 'pull', 'static')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-built workout templates
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  target_goal TEXT CHECK (target_goal IN ('strength', 'hypertrophy', 'endurance', 'general_fitness')),
  estimated_duration INT, -- minutes

  -- Template metadata
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template exercises (what exercises are in each template)
CREATE TABLE template_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

  -- Exercise parameters
  order_index INT NOT NULL,
  sets INT NOT NULL,
  reps_min INT,
  reps_max INT,
  rest_seconds INT DEFAULT 60,
  notes TEXT,

  -- Progressive overload
  rpe_target DECIMAL(2, 1), -- Rate of Perceived Exertion (6.0-10.0)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's actual workouts (instances)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id),

  -- Workout info
  name TEXT NOT NULL,
  notes TEXT,
  scheduled_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,

  -- Status
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped')) DEFAULT 'scheduled',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual exercise logs within a workout
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),

  -- Exercise parameters
  order_index INT NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual sets (the actual logging data)
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,

  -- Set data
  set_number INT NOT NULL,
  reps INT NOT NULL,
  weight DECIMAL(6, 2), -- kg or lbs
  weight_unit TEXT CHECK (weight_unit IN ('kg', 'lbs')) DEFAULT 'kg',

  -- Performance metrics
  rpe DECIMAL(2, 1), -- Rate of Perceived Exertion
  rest_seconds INT,
  is_warmup BOOLEAN DEFAULT false,
  is_dropset BOOLEAN DEFAULT false,
  is_failure BOOLEAN DEFAULT false,

  -- Tracking
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal records
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),

  -- Record types
  record_type TEXT CHECK (record_type IN ('1rm', 'max_reps', 'max_volume', 'max_weight')) NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  unit TEXT,

  -- Context
  achieved_at TIMESTAMPTZ NOT NULL,
  workout_set_id UUID REFERENCES workout_sets(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, exercise_id, record_type)
);

-- Exercise alternatives (for when equipment unavailable)
CREATE TABLE exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  similarity_score DECIMAL(3, 2), -- 0.00-1.00
  reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(primary_exercise_id, alternative_exercise_id)
);

-- Indexes for performance
CREATE INDEX idx_workouts_user_date ON workouts(user_id, scheduled_date DESC);
CREATE INDEX idx_workouts_status ON workouts(user_id, status);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(workout_exercise_id);
CREATE INDEX idx_exercises_muscles ON exercises USING GIN(primary_muscles);
CREATE INDEX idx_exercises_equipment ON exercises USING GIN(equipment);
CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
```

---

## 🏗️ Architecture Integration

### Follow Existing Patterns

```
app/
  ├── api/
  │   ├── exercises/route.ts          # GET exercises library
  │   ├── workout-templates/route.ts  # GET/POST templates
  │   └── workouts/
  │       ├── route.ts                # GET/POST workouts
  │       └── [id]/
  │           ├── route.ts            # PUT/DELETE workout
  │           └── exercises/route.ts  # POST exercise to workout

lib/
  ├── hooks/
  │   ├── use-workouts.ts             # Workout CRUD + TanStack Query
  │   ├── use-exercise-library.ts     # Exercise search/filter
  │   ├── use-workout-logger.ts       # Active workout state
  │   └── use-workout-analytics.ts    # Progress calculations

components/
  ├── views/
  │   └── workouts-view.tsx           # Main workout tab (150-200 lines)
  ├── workout/
  │   ├── workout-calendar.tsx        # Scheduled workouts
  │   ├── workout-card.tsx            # Workout summary card
  │   ├── active-workout.tsx          # In-progress workout UI
  │   ├── exercise-picker.tsx         # Exercise library search
  │   ├── set-logger.tsx              # Log set UI
  │   └── rest-timer.tsx              # Rest countdown
  └── analytics/
      ├── progress-chart.tsx          # Strength progression
      └── volume-chart.tsx            # Weekly volume
```

---

## 🚀 Implementation Phases

### Phase 1: Database & Core Hooks (Week 1)

**Goals:**
- Set up database schema
- Seed exercise library
- Create base TanStack Query hooks

**Tasks:**

1. **Database Migration** (Day 1-2)
```bash
# Create migration file
supabase/migrations/016_workout_tracking.sql
```
- Create all tables from schema above
- Add RLS policies (user can only access their own workouts)
- Create indexes

2. **Seed Exercise Library** (Day 2-3)
```typescript
// scripts/seed-exercises.ts
// Populate with 200+ exercises
// Sources: WGER API (open source), ExerciseDB API
```

3. **Core Hooks** (Day 3-5)
```typescript
// lib/hooks/use-workouts.ts
export function useWorkouts() {
  const { data: workouts, isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: fetchWorkouts,
  })

  const createWorkout = useMutation({
    mutationFn: (data) => fetch('/api/workouts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries(['workouts']),
  })

  return { workouts, createWorkout }
}

// lib/hooks/use-exercise-library.ts
export function useExerciseLibrary(filters: ExerciseFilters) {
  return useQuery({
    queryKey: ['exercises', filters],
    queryFn: () => fetchExercises(filters),
  })
}

// lib/hooks/use-workout-logger.ts
export function useWorkoutLogger(workoutId: string) {
  const [currentExercise, setCurrentExercise] = useState(0)
  const [restTimer, setRestTimer] = useState<number | null>(null)

  const logSet = useMutation({
    mutationFn: logWorkoutSet,
    onSuccess: () => {
      // Start rest timer
      setRestTimer(60)
    },
  })

  return { currentExercise, restTimer, logSet }
}
```

4. **API Routes** (Day 5)
```typescript
// app/api/workouts/route.ts
export const GET = withAuth(async (request, user) => {
  const workouts = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        *,
        exercises (*),
        workout_sets (*)
      )
    `)
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: false })

  return NextResponse.json({ workouts })
})
```

---

### Phase 2: Workout Creation & Templates (Week 2)

**Goals:**
- Build workout template system
- Create workout from template
- Exercise picker UI

**Tasks:**

1. **Template System** (Day 1-2)
```typescript
// components/workout/template-picker.tsx
export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const { data: templates } = useQuery({
    queryKey: ['workout-templates'],
    queryFn: fetchTemplates,
  })

  const categories = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body']

  return (
    <div className="space-y-4">
      {categories.map(category => (
        <div key={category}>
          <h3 className="ios-subheadline mb-2">{category}</h3>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {templates
                .filter(t => t.tags?.includes(category.toLowerCase()))
                .map(template => (
                  <Card
                    key={template.id}
                    className="frosted-card min-w-[200px] p-4 cursor-pointer"
                    onClick={() => onSelect(template)}
                  >
                    <h4 className="ios-headline">{template.name}</h4>
                    <p className="ios-caption text-muted-foreground">
                      {template.estimated_duration} min
                    </p>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  )
}
```

2. **Exercise Picker** (Day 2-3)
```typescript
// components/workout/exercise-picker.tsx
export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string[]>([])
  const [equipmentFilter, setEquipmentFilter] = useState<string[]>([])

  const { data: exercises } = useExerciseLibrary({
    search,
    muscles: muscleFilter,
    equipment: equipmentFilter,
  })

  return (
    <Sheet>
      <SheetContent side="bottom" className="h-[80vh]">
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Muscle group chips */}
        <div className="flex gap-2 mt-4">
          {MUSCLE_GROUPS.map(muscle => (
            <Badge
              key={muscle}
              variant={muscleFilter.includes(muscle) ? 'default' : 'outline'}
              onClick={() => toggleFilter(muscleFilter, setMuscleFilter, muscle)}
            >
              {muscle}
            </Badge>
          ))}
        </div>

        {/* Exercise list */}
        <div className="mt-6 space-y-2">
          {exercises?.map(exercise => (
            <Card
              key={exercise.id}
              className="p-4 flex items-center gap-3 cursor-pointer"
              onClick={() => onSelect(exercise)}
            >
              {exercise.gif_url && (
                <img src={exercise.gif_url} alt={exercise.name} className="w-16 h-16 rounded" />
              )}
              <div>
                <h4 className="ios-headline">{exercise.name}</h4>
                <p className="ios-caption text-muted-foreground">
                  {exercise.primary_muscles.join(', ')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

3. **Seed Pre-built Templates** (Day 3-4)
```typescript
// Pre-built programs
const STARTER_TEMPLATES = [
  {
    name: 'Push Day (Beginner)',
    description: 'Chest, shoulders, triceps',
    difficulty: 'beginner',
    exercises: [
      { name: 'Barbell Bench Press', sets: 3, reps: '8-12' },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
      { name: 'Lateral Raises', sets: 3, reps: '12-15' },
      { name: 'Tricep Pushdowns', sets: 3, reps: '12-15' },
    ],
  },
  // Pull, Legs, Upper, Lower, Full Body templates...
]
```

---

### Phase 3: Active Workout Logger (Week 2-3)

**Goals:**
- In-progress workout UI
- Set logging with rest timer
- Real-time progress tracking

**Tasks:**

1. **Active Workout UI** (Day 1-3)
```typescript
// components/workout/active-workout.tsx
export function ActiveWorkout({ workoutId }: ActiveWorkoutProps) {
  const { workout, currentExercise, logSet, completeWorkout } = useWorkoutLogger(workoutId)
  const [restTimer, setRestTimer] = useState<number | null>(null)

  const exercise = workout.exercises[currentExercise]

  return (
    <div className="fixed inset-0 bg-background z-50">
      {/* Header */}
      <div className="ios-card p-4 flex justify-between items-center">
        <Button variant="ghost" onClick={() => setShowQuitDialog(true)}>
          <X className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h2 className="ios-headline">{workout.name}</h2>
          <p className="ios-caption text-muted-foreground">
            Exercise {currentExercise + 1} of {workout.exercises.length}
          </p>
        </div>
        <Button variant="ghost" onClick={completeWorkout}>
          <Check className="h-5 w-5" />
        </Button>
      </div>

      {/* Exercise demo */}
      <div className="p-6">
        {exercise.gif_url && (
          <div className="aspect-video rounded-lg overflow-hidden mb-4">
            <img src={exercise.gif_url} alt={exercise.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h3 className="ios-title1 mb-2">{exercise.name}</h3>
        <p className="ios-caption text-muted-foreground mb-4">
          {exercise.primary_muscles.join(' • ')}
        </p>
      </div>

      {/* Set logging */}
      <div className="px-6 space-y-3">
        {exercise.logged_sets.map((set, idx) => (
          <SetRow key={idx} set={set} isCompleted />
        ))}
        <SetRow
          set={exercise.next_set}
          onComplete={(reps, weight) => {
            logSet.mutate({ reps, weight })
            setRestTimer(exercise.rest_seconds)
          }}
        />
      </div>

      {/* Rest timer overlay */}
      {restTimer !== null && (
        <RestTimerOverlay
          seconds={restTimer}
          onComplete={() => setRestTimer(null)}
          onSkip={() => setRestTimer(null)}
        />
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={currentExercise === 0}
            onClick={() => setCurrentExercise(currentExercise - 1)}
          >
            Previous
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (currentExercise < workout.exercises.length - 1) {
                setCurrentExercise(currentExercise + 1)
              } else {
                completeWorkout()
              }
            }}
          >
            {currentExercise < workout.exercises.length - 1 ? 'Next Exercise' : 'Finish Workout'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

2. **Set Logger Component** (Day 3-4)
```typescript
// components/workout/set-logger.tsx
export function SetRow({ set, isCompleted, onComplete }: SetRowProps) {
  const [reps, setReps] = useState(set?.reps || 0)
  const [weight, setWeight] = useState(set?.weight || 0)

  if (isCompleted) {
    return (
      <div className="ios-card p-4 flex items-center gap-4 opacity-60">
        <Check className="h-5 w-5 text-green-500" />
        <div className="flex-1">
          <span className="ios-body">Set {set.set_number}</span>
        </div>
        <div className="text-right">
          <span className="ios-headline">{set.reps} reps</span>
          <span className="ios-caption text-muted-foreground ml-2">@ {set.weight}kg</span>
        </div>
      </div>
    )
  }

  return (
    <div className="ios-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="ios-headline">Set {set.set_number}</span>
        <Badge variant="outline">Previous: {set.previous_reps} @ {set.previous_weight}kg</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Reps</Label>
          <Input
            type="number"
            value={reps}
            onChange={(e) => setReps(parseInt(e.target.value))}
            className="text-2xl text-center"
          />
        </div>
        <div>
          <Label>Weight (kg)</Label>
          <Input
            type="number"
            step="2.5"
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
            className="text-2xl text-center"
          />
        </div>
      </div>

      <Button
        className="w-full min-h-touch"
        onClick={() => onComplete(reps, weight)}
      >
        Complete Set
      </Button>
    </div>
  )
}
```

3. **Rest Timer** (Day 4)
```typescript
// components/workout/rest-timer.tsx
export function RestTimerOverlay({ seconds, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining === 0) {
      onComplete()
      return
    }

    const timer = setInterval(() => {
      setRemaining(r => r - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [remaining])

  const progress = (remaining / seconds) * 100

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="text-center">
        <div className="relative w-48 h-48 mb-8">
          <svg className="transform -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted-foreground opacity-20"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              className="text-primary transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-bold">{remaining}</span>
          </div>
        </div>

        <p className="ios-title2 mb-6">Rest Time</p>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onSkip}>
            Skip Rest
          </Button>
          <Button onClick={() => setRemaining(remaining + 30)}>
            +30s
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
```

---

### Phase 4: Analytics & Progress (Week 3-4)

**Goals:**
- Workout history calendar
- Progress charts (strength, volume)
- Personal records tracking
- Progressive overload suggestions

**Tasks:**

1. **Workout History** (Day 1-2)
```typescript
// components/workout/workout-calendar.tsx
export function WorkoutCalendar() {
  const { data: workouts } = useWorkouts()
  const [selectedDate, setSelectedDate] = useState(new Date())

  const workoutsByDate = useMemo(() => {
    return groupBy(workouts, w => format(new Date(w.completed_at), 'yyyy-MM-dd'))
  }, [workouts])

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        modifiers={{
          workout: (date) => workoutsByDate[format(date, 'yyyy-MM-dd')]
        }}
        modifiersClassNames={{
          workout: 'bg-primary/20 font-bold'
        }}
      />

      {/* Workouts on selected date */}
      <div className="space-y-3">
        {workoutsByDate[format(selectedDate, 'yyyy-MM-dd')]?.map(workout => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}
      </div>
    </div>
  )
}
```

2. **Progress Charts** (Day 2-4)
```typescript
// components/analytics/strength-progression.tsx
export function StrengthProgression({ exerciseId }: StrengthProgressionProps) {
  const { data: progressData } = useQuery({
    queryKey: ['strength-progress', exerciseId],
    queryFn: () => fetchExerciseProgress(exerciseId),
  })

  // Calculate estimated 1RM for each workout
  const chartData = progressData.map(workout => ({
    date: workout.completed_at,
    estimated1RM: calculateEstimated1RM(workout.max_weight, workout.reps),
    actualWeight: workout.max_weight,
    volume: workout.total_volume, // sets * reps * weight
  }))

  return (
    <Card className="ios-card p-6">
      <h3 className="ios-headline mb-4">Strength Progression</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'MMM d')}
          />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="estimated1RM"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Estimated 1RM"
          />
          <Line
            type="monotone"
            dataKey="actualWeight"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Max Weight"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Personal Record */}
      <div className="mt-4 p-4 rounded-lg bg-primary/10">
        <div className="flex items-center justify-between">
          <span className="ios-body">Personal Record</span>
          <div className="text-right">
            <p className="ios-title2 text-primary">{progressData.personalRecord.weight}kg</p>
            <p className="ios-caption text-muted-foreground">
              {formatDistanceToNow(new Date(progressData.personalRecord.date))} ago
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
```

3. **Progressive Overload Suggestions** (Day 4-5)
```typescript
// lib/analytics/progressive-overload.ts
export function suggestProgression(exercise: Exercise, history: WorkoutSet[]) {
  const lastWorkout = history[0]
  const recentWorkouts = history.slice(0, 3)

  // Check if user has been hitting target reps consistently
  const hittingTargetReps = recentWorkouts.every(w =>
    w.sets.every(s => s.reps >= exercise.target_reps)
  )

  if (hittingTargetReps) {
    return {
      type: 'increase_weight',
      suggestion: `You've hit ${exercise.target_reps} reps for 3 workouts. Try increasing weight by 2.5kg.`,
      newWeight: lastWorkout.weight + 2.5,
    }
  }

  // Check if struggling (not hitting target reps)
  const strugglingRecently = recentWorkouts.every(w =>
    w.sets.some(s => s.reps < exercise.target_reps - 2)
  )

  if (strugglingRecently) {
    return {
      type: 'decrease_weight',
      suggestion: `Consider reducing weight by 5% to focus on form.`,
      newWeight: lastWorkout.weight * 0.95,
    }
  }

  // Check for volume increase
  const avgVolume = average(recentWorkouts.map(calculateVolume))
  if (avgVolume > lastWorkout.volume * 1.1) {
    return {
      type: 'increase_sets',
      suggestion: `Great volume! Consider adding 1 more set.`,
      newSets: lastWorkout.sets + 1,
    }
  }

  return {
    type: 'maintain',
    suggestion: `Keep current weight and aim for top of rep range.`,
  }
}
```

---

### Phase 5: AI Features & Polish (Week 4)

**Goals:**
- AI workout plan generation
- Alternative exercise suggestions
- Workout insights
- Final UI polish

**Tasks:**

1. **AI Workout Generator** (Day 1-3)
```typescript
// app/api/ai/generate-workout/route.ts
export const POST = withAuth(async (request, user) => {
  const { goal, frequency, duration, equipment, experience } = await request.json()

  const profile = await fetchUserProfile(user.id)

  // Use OpenAI to generate personalized plan
  const prompt = `Generate a ${frequency}-day workout plan for a ${experience} lifter.

  Goals: ${goal}
  Session Duration: ${duration} minutes
  Available Equipment: ${equipment.join(', ')}

  Return a structured JSON workout plan with exercises, sets, reps, and rest times.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: 'You are a certified personal trainer...' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  })

  const workoutPlan = JSON.parse(completion.choices[0].message.content)

  // Save as templates
  await saveWorkoutTemplates(user.id, workoutPlan)

  return NextResponse.json({ plan: workoutPlan })
})
```

2. **Exercise Alternatives** (Day 3-4)
```typescript
// components/workout/exercise-alternatives.tsx
export function ExerciseAlternatives({ exercise }: ExerciseAlternativesProps) {
  const { data: alternatives } = useQuery({
    queryKey: ['exercise-alternatives', exercise.id],
    queryFn: () => fetchAlternatives(exercise.id),
  })

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Replace className="h-4 w-4 mr-2" />
          Find Alternative
        </Button>
      </SheetTrigger>
      <SheetContent>
        <h3 className="ios-title2 mb-4">Similar Exercises</h3>
        <p className="ios-caption text-muted-foreground mb-6">
          These exercises target the same muscle groups
        </p>

        <div className="space-y-3">
          {alternatives?.map(alt => (
            <Card
              key={alt.id}
              className="p-4 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onSelect(alt)}
            >
              <div className="flex items-center gap-3">
                <img src={alt.gif_url} className="w-12 h-12 rounded" />
                <div className="flex-1">
                  <h4 className="ios-headline">{alt.name}</h4>
                  <p className="ios-caption text-muted-foreground">
                    {alt.equipment.join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">
                    {Math.round(alt.similarity_score * 100)}% match
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

3. **Workout Insights** (Day 4-5)
```typescript
// lib/analytics/workout-insights.ts
export function generateWorkoutInsights(workouts: Workout[], goals: WorkoutProfile) {
  const insights: Insight[] = []

  // Consistency check
  const workoutsThisWeek = workouts.filter(w =>
    isWithinInterval(new Date(w.completed_at), {
      start: startOfWeek(new Date()),
      end: endOfWeek(new Date()),
    })
  )

  if (workoutsThisWeek.length >= goals.training_frequency) {
    insights.push({
      type: 'positive',
      title: 'On Track!',
      description: `You've completed ${workoutsThisWeek.length}/${goals.training_frequency} workouts this week.`,
      icon: '🎯',
    })
  } else {
    insights.push({
      type: 'warning',
      title: 'Missing Workouts',
      description: `Only ${workoutsThisWeek.length}/${goals.training_frequency} workouts done. Schedule more to stay consistent.`,
      icon: '⚠️',
    })
  }

  // Volume trends
  const recentVolume = calculateWeeklyVolume(workouts.slice(0, 7))
  const previousVolume = calculateWeeklyVolume(workouts.slice(7, 14))

  if (recentVolume > previousVolume * 1.2) {
    insights.push({
      type: 'info',
      title: 'Volume Increase',
      description: `Weekly volume up ${Math.round((recentVolume / previousVolume - 1) * 100)}%. Watch for overtraining.`,
      icon: '📈',
    })
  }

  // Personal records
  const recentPRs = workouts
    .flatMap(w => w.personal_records)
    .filter(pr => isWithinInterval(new Date(pr.achieved_at), {
      start: subDays(new Date(), 30),
      end: new Date(),
    }))

  if (recentPRs.length > 0) {
    insights.push({
      type: 'positive',
      title: 'New Records!',
      description: `You set ${recentPRs.length} personal record${recentPRs.length > 1 ? 's' : ''} this month.`,
      icon: '🏆',
    })
  }

  return insights
}
```

---

## 🎨 UI/UX Design

### Mobile-First Principles

1. **Workout Cards** (Similar to expense cards)
```tsx
<Card className="ios-card p-4 border-l-4 border-l-blue-500">
  <div className="flex items-center justify-between mb-2">
    <h3 className="ios-headline">Push Day</h3>
    <Badge variant="outline">Completed</Badge>
  </div>
  <p className="ios-caption text-muted-foreground mb-3">
    45 min • 6 exercises • 18 sets
  </p>
  <div className="flex gap-2">
    <Button variant="ghost" size="sm">View</Button>
    <Button variant="ghost" size="sm">Repeat</Button>
  </div>
</Card>
```

2. **Bottom Sheet for Exercise Picker** (Native mobile feel)
```tsx
<Sheet>
  <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
    {/* Exercise search and selection */}
  </SheetContent>
</Sheet>
```

3. **Haptic Feedback** (on set completion)
```typescript
if ('vibrate' in navigator) {
  navigator.vibrate(50) // Short vibration on set complete
}
```

4. **Swipe Gestures** (delete workout, mark complete)
```tsx
<SwipeableCard
  onSwipeLeft={() => markComplete(workout.id)}
  onSwipeRight={() => deleteWorkout(workout.id)}
>
  <WorkoutCard workout={workout} />
</SwipeableCard>
```

---

## 📊 Analytics Dashboard

### Workout Stats View
```
┌─────────────────────────────────────┐
│  This Week                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  4/5 workouts completed    80%      │
│  Total Volume: 12,450 kg            │
│  Avg Duration: 52 min               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Strength Progress                  │
│  ┌─────────────────────────────┐    │
│  │ Bench Press                 │    │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━   │    │
│  │ 80kg → 85kg (+6.3%)         │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Squat                       │    │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━   │    │
│  │ 100kg → 110kg (+10%)        │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Personal Records (Last 30 days)    │
│  🏆 Bench Press: 85kg x 5           │
│  🏆 Deadlift: 140kg x 3             │
│  🏆 Pull-ups: 12 reps               │
└─────────────────────────────────────┘
```

---

## 🔧 Technical Considerations

### Performance

1. **Virtual Scrolling** (for exercise library)
```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: exercises.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
})
```

2. **Lazy Load Exercise Media**
```tsx
<img
  src={exercise.gif_url}
  loading="lazy"
  className="w-full h-full object-cover"
/>
```

3. **Offline Support** (PWA)
```typescript
// service-worker.js
// Cache exercise GIFs and workout data
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/exercises')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    )
  }
})
```

### Data Sources

1. **Exercise Database** (Free APIs)
- [WGER API](https://wger.de/api/v2/) - 300+ exercises, open source
- [ExerciseDB API](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb) - 1300+ exercises with GIFs
- [Free Fitness API](https://github.com/yuhonas/free-exercise-db) - Public domain

2. **Exercise Media**
- Host GIFs on Supabase Storage
- Or use CDN links from ExerciseDB

---

## 🎯 Success Metrics

### Phase Completion Criteria

**Phase 1:** ✅ Database schema created, APIs working, core hooks functional

**Phase 2:** ✅ Can create workout from template, exercise picker works

**Phase 3:** ✅ Can log complete workout with sets/reps/weight, rest timer works

**Phase 4:** ✅ Workout history displays, progress charts show data

**Phase 5:** ✅ AI generates workout plans, alternatives work, insights show

### User Testing Checklist
- [ ] Complete a full workout from start to finish
- [ ] Create custom workout template
- [ ] View workout history and stats
- [ ] Generate AI workout plan
- [ ] Find alternative exercises
- [ ] Works offline (PWA)
- [ ] Smooth on iPhone (Safari)
- [ ] Dark mode works correctly

---

## 🚀 Future Enhancements (Post-MVP)

### V2 Features (Not in this plan)
- 📷 Form check via video upload (computer vision)
- 🎧 Audio coach during workout
- 📱 Apple Health / Google Fit integration
- 🏃 Cardio tracking (running, cycling)
- 📈 Body measurements tracker
- 🍎 Nutrition integration (link to expense tracker for food purchases)
- 🔔 Smart workout reminders (based on recovery)
- 📊 Advanced analytics (periodization, deload weeks)

---

## 📝 Migration Path

### Existing Users
1. Show workout onboarding modal
2. Ask for fitness goals and equipment
3. Generate starter workout plan
4. Prompt to log first workout

### Data Safety
- All workout data scoped to user (RLS policies)
- No breaking changes to existing expense tables
- Independent feature (can be disabled in settings)

---

## 🎨 Component Sizing Targets

Following CLAUDE.md guidelines:

| Component | Target Lines | Notes |
|-----------|--------------|-------|
| workouts-view.tsx | 150-200 | Main view orchestrator |
| active-workout.tsx | 200-250 | Complex interactive UI |
| workout-card.tsx | 80-100 | Reusable card |
| exercise-picker.tsx | 150-180 | Search + filters |
| set-logger.tsx | 100-120 | Set input form |
| rest-timer.tsx | 80-100 | Timer overlay |
| workout-calendar.tsx | 120-150 | Calendar + list |
| strength-progression.tsx | 150-180 | Chart + analysis |

All hooks: 100-200 lines max ✅

---

## ✅ Implementation Checklist

### Week 1: Foundation
- [ ] Create migration file (016_workout_tracking.sql)
- [ ] Run migration and verify tables
- [ ] Set up RLS policies
- [ ] Seed exercise library (200+ exercises)
- [ ] Create API routes (workouts, exercises, templates)
- [ ] Build core hooks (use-workouts, use-exercise-library)
- [ ] Add workout tab to bottom navigation

### Week 2: Templates & UI
- [ ] Build template picker component
- [ ] Build exercise picker with search
- [ ] Create pre-built workout templates
- [ ] Implement workout creation flow
- [ ] Add workout card component
- [ ] Test template-to-workout conversion

### Week 3: Active Logging
- [ ] Build active workout UI
- [ ] Implement set logger
- [ ] Add rest timer overlay
- [ ] Add exercise navigation
- [ ] Implement workout completion flow
- [ ] Add haptic feedback

### Week 4: Analytics & Polish
- [ ] Build workout calendar
- [ ] Create progress charts
- [ ] Implement PR tracking
- [ ] Add progressive overload suggestions
- [ ] Generate workout insights
- [ ] AI workout generation
- [ ] Exercise alternatives
- [ ] Final UI polish and testing

---

## 🎉 Expected Outcome

After 3-4 weeks, users will have:
- ✅ Comprehensive workout tracking system
- ✅ AI-powered workout plan generation
- ✅ Exercise library with 200+ exercises
- ✅ Progress analytics and insights
- ✅ Personal record tracking
- ✅ Mobile-first, iOS-native feel
- ✅ Offline support (PWA)
- ✅ Integrated with existing ExpensePal UI

**Combined App Value:** Track both finances AND fitness in one beautiful, cohesive mobile PWA.

---

**Ready to implement?** Start with Phase 1, Day 1: Database Migration! 🚀
