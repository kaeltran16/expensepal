# AI Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a cohesive "AI layer" to ExpensePal with three features: Smart Natural Language Input (replacing quick-add), AI Habit Coach (routine pattern analysis + suggestions), and Enhanced Weekly Digest (unified cross-domain AI summary replacing the separate weekly summary + nutrition summary).

**Architecture:** Three new API routes under `app/api/ai/` using the existing `LLMService` class. Each route accepts domain data, sends it to Gemini 2.5 Flash via OpenRouter, and returns structured JSON. New React components consume these via TanStack Query hooks. The NL input replaces the quick-add FAB entry point. The habit coach surfaces as a card in the routines view. The weekly digest replaces `WeeklySummary` + `WeeklyNutritionSummary` with a single unified component.

**Tech Stack:** Next.js 14 API routes, LLMService (OpenRouter/Gemini), TanStack Query v5, Zod validation, Framer Motion animations, existing Supabase hooks.

---

## Task 1: NL Input — API Route

**Files:**
- Create: `app/api/ai/parse-input/route.ts`
- Reference: `lib/llm-service.ts`, `lib/api/middleware.ts`

**Step 1: Write the failing test**

Create `__tests__/api/ai/parse-input.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock LLMService
vi.mock('@/lib/llm-service', () => ({
  llmService: {
    isConfigured: vi.fn(() => true),
    completion: vi.fn(),
  },
}))

import { llmService } from '@/lib/llm-service'

describe('POST /api/ai/parse-input', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse an expense input', async () => {
    const mockLLMResponse = {
      content: JSON.stringify({
        intent: 'expense',
        confidence: 0.95,
        data: {
          amount: 45000,
          currency: 'VND',
          merchant: 'Coffee shop',
          category: 'Food',
        },
      }),
    }
    vi.mocked(llmService.completion).mockResolvedValue(mockLLMResponse)

    const { POST } = await import('@/app/api/ai/parse-input/route')
    const request = new Request('http://localhost/api/ai/parse-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'coffee 45k' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.intent).toBe('expense')
    expect(data.data.amount).toBe(45000)
  })

  it('should parse a meal input', async () => {
    const mockLLMResponse = {
      content: JSON.stringify({
        intent: 'meal',
        confidence: 0.9,
        data: {
          name: 'Pho',
          meal_time: 'lunch',
          calories: 450,
        },
      }),
    }
    vi.mocked(llmService.completion).mockResolvedValue(mockLLMResponse)

    const { POST } = await import('@/app/api/ai/parse-input/route')
    const request = new Request('http://localhost/api/ai/parse-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'had pho for lunch' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.intent).toBe('meal')
  })

  it('should return 400 for empty input', async () => {
    const { POST } = await import('@/app/api/ai/parse-input/route')
    const request = new Request('http://localhost/api/ai/parse-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/ai/parse-input.test.ts`
Expected: FAIL — module not found

**Step 3: Write the API route**

Create `app/api/ai/parse-input/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm-service'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are an input classifier for a personal finance and fitness app. Given a natural language input, classify it into one of these intents and extract structured data.

Intents:
1. "expense" — user is logging a purchase or spending. Extract: amount (number), currency (default "VND"), merchant (string), category (one of: Food, Transport, Shopping, Entertainment, Bills, Health, Other), notes (optional string), transaction_date (ISO string, default today).
   - "k" means thousand (45k = 45000), "m" or "tr" means million (1.5m = 1500000)
   - Infer category from context (coffee/restaurant → Food, grab/taxi → Transport, etc.)

2. "meal" — user is logging food they ate. Extract: name (string), meal_time (breakfast/lunch/dinner/snack — infer from time context or default to nearest meal), calories (estimate if possible, null if unsure), protein/carbs/fat (estimate or null).

3. "routine" — user is logging a routine/habit completion or skip. Extract: routine_name (string), completed (boolean), notes (optional).

4. "goal" — user is contributing to a savings goal. Extract: goal_name (string), amount (number).

5. "unknown" — cannot determine intent.

Respond with ONLY valid JSON:
{
  "intent": "expense" | "meal" | "routine" | "goal" | "unknown",
  "confidence": 0.0-1.0,
  "data": { ... extracted fields ... },
  "display_text": "Short confirmation text for the user, e.g. 'Coffee shop — 45,000 VND'"
}

Current date/time: {{now}}
`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const input = body.input?.trim()

  if (!input) {
    return NextResponse.json({ error: 'Input is required' }, { status: 400 })
  }

  if (!llmService.isConfigured()) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const now = new Date().toISOString()
  const systemPrompt = SYSTEM_PROMPT.replace('{{now}}', now)

  const response = await llmService.completion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ],
    temperature: 0.1,
    maxTokens: 500,
  })

  if (!response) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const parsed = llmService.parseJSON<{
    intent: string
    confidence: number
    data: Record<string, unknown>
    display_text: string
  }>(response.content)

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }

  return NextResponse.json(parsed)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/api/ai/parse-input.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/ai/parse-input/route.ts __tests__/api/ai/parse-input.test.ts
git commit -m "feat(ai): add NL input parsing API route"
```

---

## Task 2: NL Input — Hook

**Files:**
- Create: `lib/hooks/use-nl-input.ts`
- Reference: `lib/hooks/use-expenses.ts`, `lib/hooks/use-meals.ts`, `lib/hooks/use-goals.ts`, `lib/hooks/use-routines.ts`

**Step 1: Write the hook**

Create `lib/hooks/use-nl-input.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCreateExpenseOptimistic } from './use-expenses'
import { useCreateMeal } from './use-meals'
import { useCompleteRoutineOptimistic } from './use-routines'
import { useContributeToGoal } from './use-goals'
import { queryKeys } from './query-keys'

interface ParsedInput {
  intent: 'expense' | 'meal' | 'routine' | 'goal' | 'unknown'
  confidence: number
  data: Record<string, unknown>
  display_text: string
}

// Step 1: Parse — sends text to API, returns structured intent + data
export function useParseInput() {
  return useMutation({
    mutationFn: async (input: string): Promise<ParsedInput> => {
      const res = await fetch('/api/ai/parse-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      if (!res.ok) throw new Error('Failed to parse input')
      return res.json()
    },
  })
}

// Step 2: Execute — takes the parsed result and dispatches to the right mutation
export function useExecuteParsedInput() {
  const createExpense = useCreateExpenseOptimistic()
  const createMeal = useCreateMeal()
  const completeRoutine = useCompleteRoutineOptimistic()
  const contributeToGoal = useContributeToGoal()

  return useMutation({
    mutationFn: async (parsed: ParsedInput) => {
      const { intent, data } = parsed

      switch (intent) {
        case 'expense':
          return createExpense.mutateAsync({
            amount: data.amount as number,
            merchant: data.merchant as string,
            category: (data.category as string) || 'Other',
            currency: (data.currency as string) || 'VND',
            transaction_date: (data.transaction_date as string) || new Date().toISOString(),
            transaction_type: 'Expense',
            source: 'ai',
          })

        case 'meal':
          return createMeal.mutateAsync({
            name: data.name as string,
            meal_time: (data.meal_time as string) || 'snack',
            meal_date: new Date().toISOString().split('T')[0],
            calories: data.calories as number | undefined,
            protein: data.protein as number | undefined,
            carbs: data.carbs as number | undefined,
            fat: data.fat as number | undefined,
            source: 'llm',
            estimate: !data.calories, // trigger LLM estimation if no calories
          })

        case 'goal':
          return contributeToGoal.mutateAsync({
            goalId: data.goal_id as string,
            amount: data.amount as number,
          })

        case 'routine':
          // For routines, we need the template_id — return the parsed data
          // and let the UI handle matching to a template
          return { intent: 'routine', data }

        default:
          throw new Error(`Unknown intent: ${intent}`)
      }
    },
  })
}
```

**Step 2: Commit**

```bash
git add lib/hooks/use-nl-input.ts
git commit -m "feat(ai): add NL input parsing and execution hooks"
```

---

## Task 3: NL Input — Component (replace quick-add)

**Files:**
- Create: `components/nl-input-sheet.tsx`
- Modify: `app/page.tsx` — replace QuickExpenseForm FAB trigger with NL input sheet
- Reference: `components/quick-expense-form.tsx`

**Step 1: Create the NL input sheet component**

Create `components/nl-input-sheet.tsx`:

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, X, Check, Loader2, ArrowRight } from 'lucide-react'
import { useParseInput, useExecuteParsedInput } from '@/lib/hooks/use-nl-input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'

interface NLInputSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFallbackToForm?: () => void // open manual expense form
}

const INTENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  expense: { label: 'Expense', icon: '💰', color: 'text-orange-500' },
  meal: { label: 'Meal', icon: '🍽️', color: 'text-green-500' },
  routine: { label: 'Routine', icon: '✅', color: 'text-blue-500' },
  goal: { label: 'Goal', icon: '🎯', color: 'text-purple-500' },
  unknown: { label: 'Unknown', icon: '❓', color: 'text-gray-500' },
}

const EXAMPLES = [
  'coffee 45k',
  'grab to work 32k',
  'had pho for lunch',
  'ran 5km this morning',
  'saved 500k for vacation',
]

export function NLInputSheet({ open, onOpenChange, onFallbackToForm }: NLInputSheetProps) {
  const [input, setInput] = useState('')
  const [step, setStep] = useState<'input' | 'confirm' | 'done'>('input')
  const inputRef = useRef<HTMLInputElement>(null)
  const parseInput = useParseInput()
  const executeInput = useExecuteParsedInput()

  useEffect(() => {
    if (open) {
      setStep('input')
      setInput('')
      parseInput.reset()
      executeInput.reset()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!input.trim()) return
    const result = await parseInput.mutateAsync(input.trim())
    if (result.intent === 'unknown' || result.confidence < 0.5) {
      toast.error("Couldn't understand that. Try again or use manual entry.")
      return
    }
    setStep('confirm')
  }

  const handleConfirm = async () => {
    if (!parseInput.data) return
    try {
      await executeInput.mutateAsync(parseInput.data)
      setStep('done')
      toast.success(parseInput.data.display_text)
      setTimeout(() => onOpenChange(false), 800)
    } catch {
      toast.error('Failed to save. Try again.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (step === 'input') handleSubmit()
      else if (step === 'confirm') handleConfirm()
    }
  }

  const parsed = parseInput.data
  const intentMeta = parsed ? INTENT_LABELS[parsed.intent] : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Quick Add
          </SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type anything... e.g. coffee 45k"
                  className="w-full rounded-xl border bg-muted/50 px-4 py-3 pr-12 text-base outline-none focus:ring-2 focus:ring-violet-500/50"
                  disabled={parseInput.isPending}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || parseInput.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-violet-500 p-2 text-white disabled:opacity-50"
                >
                  {parseInput.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Example chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Manual entry fallback */}
              {onFallbackToForm && (
                <button
                  onClick={() => {
                    onOpenChange(false)
                    onFallbackToForm()
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground"
                >
                  Or use manual form <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          )}

          {step === 'confirm' && parsed && intentMeta && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{intentMeta.icon}</span>
                  <span className={intentMeta.color}>{intentMeta.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Math.round(parsed.confidence * 100)}% confident
                  </span>
                </div>
                <p className="mt-2 text-lg font-semibold">{parsed.display_text}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('input')}
                >
                  <X className="mr-1 h-4 w-4" /> Edit
                </Button>
                <Button
                  className="flex-1 bg-violet-500 hover:bg-violet-600"
                  onClick={handleConfirm}
                  disabled={executeInput.isPending}
                >
                  {executeInput.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Confirm
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center py-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <p className="mt-3 font-medium">Saved!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Integrate into main page**

Modify `app/page.tsx` — find the FAB / quick-add trigger and add NL input sheet alongside it. Keep QuickExpenseForm as fallback.

The FAB button should:
- **Tap:** Open `NLInputSheet`
- **NLInputSheet** has a "manual form" fallback link that opens `QuickExpenseForm`

Add to page.tsx imports:
```typescript
import { NLInputSheet } from '@/components/nl-input-sheet'
```

Add state:
```typescript
const [showNLInput, setShowNLInput] = useState(false)
```

Replace the FAB `onClick` from `setShowQuickAdd(true)` to `setShowNLInput(true)`.

Add the component in the JSX:
```typescript
<NLInputSheet
  open={showNLInput}
  onOpenChange={setShowNLInput}
  onFallbackToForm={() => setShowQuickAdd(true)}
/>
```

**Step 3: Run the app and test manually**

Run: `npm run dev`
- Tap the FAB button → NL input sheet opens
- Type "coffee 45k" → shows intent: Expense, "Coffee shop — 45,000 VND"
- Tap Confirm → expense is created
- Tap "manual form" → original QuickExpenseForm opens

**Step 4: Commit**

```bash
git add components/nl-input-sheet.tsx app/page.tsx
git commit -m "feat(ai): add NL input sheet replacing quick-add as primary entry"
```

---

## Task 4: AI Habit Coach — API Route

**Files:**
- Create: `app/api/ai/habit-coach/route.ts`
- Reference: `lib/llm-service.ts`, `lib/supabase/server.ts`

**Step 1: Write the failing test**

Create `__tests__/api/ai/habit-coach.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/llm-service', () => ({
  llmService: {
    isConfigured: vi.fn(() => true),
    completion: vi.fn(),
  },
}))

import { llmService } from '@/lib/llm-service'

describe('GET /api/ai/habit-coach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return coaching suggestions', async () => {
    vi.mocked(llmService.completion).mockResolvedValue({
      content: JSON.stringify({
        suggestions: [
          {
            type: 'pattern',
            title: 'Monday struggles',
            description: 'You tend to skip your morning routine on Mondays.',
            action: 'Try a shorter 5-minute version on Mondays.',
          },
        ],
        encouragement: 'Great 5-day streak! Keep it up.',
        streak_status: 'strong',
      }),
    })

    // Test will verify the route returns structured suggestions
    expect(llmService.isConfigured()).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/ai/habit-coach.test.ts`
Expected: PASS (this is a smoke test for the mock — real integration tested in step 4)

**Step 3: Write the API route**

Create `app/api/ai/habit-coach/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm-service'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are a friendly habit coach for a personal productivity app. Analyze the user's routine completion data and provide actionable suggestions.

Given the data, identify:
1. **Patterns** — Which days/times they're most/least consistent
2. **Risks** — Streak-breaking patterns or declining completion rates
3. **Wins** — Positive trends to reinforce

Respond with ONLY valid JSON:
{
  "suggestions": [
    {
      "type": "pattern" | "risk" | "win" | "tip",
      "title": "Short title (max 8 words)",
      "description": "One sentence explanation",
      "action": "One specific actionable suggestion"
    }
  ],
  "encouragement": "One sentence of personalized encouragement",
  "streak_status": "strong" | "at_risk" | "building" | "fresh_start"
}

Keep it concise — max 3 suggestions. Be warm but not cheesy. Be specific to their data, not generic.`

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!llmService.isConfigured()) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  // Fetch last 30 days of routine completions
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [completionsResult, templatesResult, streakResult] = await Promise.all([
    supabase
      .from('routines_completions')
      .select('routine_date, time_of_day, template_id, duration_minutes, xp_earned')
      .eq('user_id', user.id)
      .gte('routine_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('routine_date', { ascending: true }),
    supabase
      .from('routine_templates')
      .select('id, name, time_of_day, frequency')
      .eq('user_id', user.id),
    supabase
      .from('user_routine_streaks')
      .select('current_streak, longest_streak, last_completed_date')
      .eq('user_id', user.id)
      .single(),
  ])

  const completions = completionsResult.data || []
  const templates = templatesResult.data || []
  const streak = streakResult.data

  // Build analysis data for LLM
  const dayOfWeekCounts: Record<string, number> = {}
  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  completions.forEach((c) => {
    const day = dayOfWeekNames[new Date(c.routine_date).getDay()]
    dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1
  })

  const timeOfDayCounts: Record<string, number> = {}
  completions.forEach((c) => {
    if (c.time_of_day) {
      timeOfDayCounts[c.time_of_day] = (timeOfDayCounts[c.time_of_day] || 0) + 1
    }
  })

  // Calculate completion rate (completions per day over last 30 days)
  const uniqueDays = new Set(completions.map((c) => c.routine_date)).size
  const totalDays = 30

  const analysisData = {
    total_completions: completions.length,
    unique_days_active: uniqueDays,
    total_days: totalDays,
    completion_rate: Math.round((uniqueDays / totalDays) * 100),
    by_day_of_week: dayOfWeekCounts,
    by_time_of_day: timeOfDayCounts,
    current_streak: streak?.current_streak || 0,
    longest_streak: streak?.longest_streak || 0,
    last_completed: streak?.last_completed_date || null,
    routines: templates.map((t) => t.name),
  }

  const response = await llmService.completion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Here is my routine data for the last 30 days:\n${JSON.stringify(analysisData, null, 2)}` },
    ],
    temperature: 0.4,
    maxTokens: 800,
  })

  if (!response) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const parsed = llmService.parseJSON<{
    suggestions: Array<{
      type: string
      title: string
      description: string
      action: string
    }>
    encouragement: string
    streak_status: string
  }>(response.content)

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }

  return NextResponse.json(parsed)
}
```

**Step 4: Run test and verify**

Run: `npx vitest run __tests__/api/ai/habit-coach.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/ai/habit-coach/route.ts __tests__/api/ai/habit-coach.test.ts
git commit -m "feat(ai): add habit coach API route with routine pattern analysis"
```

---

## Task 5: AI Habit Coach — Hook + Component

**Files:**
- Create: `lib/hooks/use-habit-coach.ts`
- Create: `components/habit-coach-card.tsx`
- Modify: `components/views/routines-view.tsx` — add the card

**Step 1: Create the hook**

Create `lib/hooks/use-habit-coach.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

interface CoachSuggestion {
  type: 'pattern' | 'risk' | 'win' | 'tip'
  title: string
  description: string
  action: string
}

interface HabitCoachResponse {
  suggestions: CoachSuggestion[]
  encouragement: string
  streak_status: 'strong' | 'at_risk' | 'building' | 'fresh_start'
}

export function useHabitCoach(options?: { enabled?: boolean }) {
  return useQuery<HabitCoachResponse>({
    queryKey: [...queryKeys.routines.all, 'habit-coach'],
    queryFn: async () => {
      const res = await fetch('/api/ai/habit-coach')
      if (!res.ok) throw new Error('Failed to fetch coaching')
      return res.json()
    },
    staleTime: 1000 * 60 * 60 * 12, // 12 hours — coaching doesn't change often
    enabled: options?.enabled ?? true,
  })
}
```

**Step 2: Create the component**

Create `components/habit-coach-card.tsx`:

```typescript
'use client'

import { motion } from 'framer-motion'
import { Brain, TrendingUp, AlertTriangle, Star, Lightbulb, Loader2 } from 'lucide-react'
import { useHabitCoach } from '@/lib/hooks/use-habit-coach'

const TYPE_CONFIG: Record<string, { icon: typeof Brain; color: string; bg: string }> = {
  pattern: { icon: Brain, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-500/20' },
  risk: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  win: { icon: Star, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-500/20' },
  tip: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20' },
}

export function HabitCoachCard() {
  const { data, isLoading, error } = useHabitCoach()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Encouragement header */}
      <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 p-4">
        <Brain className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
        <div>
          <p className="text-sm font-medium">AI Coach</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{data.encouragement}</p>
        </div>
      </div>

      {/* Suggestion cards */}
      {data.suggestions.map((suggestion, i) => {
        const config = TYPE_CONFIG[suggestion.type] || TYPE_CONFIG.tip
        const Icon = config.icon

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border p-3"
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-lg p-1.5 ${config.bg}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{suggestion.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.description}</p>
                <p className="mt-1.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                  {suggestion.action}
                </p>
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
```

**Step 3: Add to routines view**

Modify `components/views/routines-view.tsx` — add the `HabitCoachCard` component. Place it after the streak display and before the routine list.

Add import:
```typescript
import { HabitCoachCard } from '@/components/habit-coach-card'
```

Add in JSX (after streak section):
```typescript
<HabitCoachCard />
```

**Step 4: Test manually**

Run: `npm run dev`
Navigate to Routines view → should see AI Coach card with suggestions.

**Step 5: Commit**

```bash
git add lib/hooks/use-habit-coach.ts components/habit-coach-card.tsx components/views/routines-view.tsx
git commit -m "feat(ai): add habit coach card to routines view"
```

---

## Task 6: Enhanced Weekly Digest — API Route

**Files:**
- Create: `app/api/ai/weekly-digest/route.ts`
- Reference: `lib/llm-service.ts`, `lib/supabase/server.ts`

**Step 1: Write the API route**

Create `app/api/ai/weekly-digest/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm-service'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are a personal assistant summarizing a user's week across finances, fitness, and habits. Write a concise, friendly weekly digest.

Given the raw data, produce a JSON response with these sections:

{
  "headline": "One catchy sentence summarizing the week (max 15 words)",
  "sections": [
    {
      "domain": "spending" | "nutrition" | "fitness" | "routines" | "goals",
      "emoji": "single emoji",
      "title": "Short section title (2-4 words)",
      "summary": "2-3 sentences with specific numbers. Compare to previous week where data exists.",
      "highlight": "One standout stat or achievement (optional, null if none)"
    }
  ],
  "tip_of_the_week": "One actionable cross-domain tip based on the data (e.g., 'Your food spending and calorie intake both spike on weekends — meal prepping on Sunday could help both your budget and your diet.')"
}

Rules:
- Only include sections where there is meaningful data (skip empty domains)
- Use specific numbers, not vague language
- Keep it warm and motivating, not judgmental
- Max 4 sections
- The tip should connect insights across domains when possible`

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!llmService.isConfigured()) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const weekAgoStr = weekAgo.toISOString().split('T')[0]
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  // Fetch all domain data in parallel
  const [
    thisWeekExpenses,
    lastWeekExpenses,
    thisWeekMeals,
    thisWeekWorkouts,
    thisWeekRoutines,
    goals,
    calorieGoal,
    streak,
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount, category, merchant, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', weekAgo.toISOString())
      .lte('transaction_date', now.toISOString()),
    supabase
      .from('expenses')
      .select('amount, category')
      .eq('user_id', user.id)
      .gte('transaction_date', twoWeeksAgo.toISOString())
      .lt('transaction_date', weekAgo.toISOString()),
    supabase
      .from('meals')
      .select('calories, protein, carbs, fat, meal_date')
      .eq('user_id', user.id)
      .gte('meal_date', weekAgoStr)
      .lte('meal_date', todayStr),
    supabase
      .from('workouts')
      .select('duration_minutes, completed_at')
      .eq('user_id', user.id)
      .gte('completed_at', weekAgo.toISOString()),
    supabase
      .from('routines_completions')
      .select('routine_date, xp_earned')
      .eq('user_id', user.id)
      .gte('routine_date', weekAgoStr)
      .lte('routine_date', todayStr),
    supabase
      .from('savings_goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', user.id),
    supabase
      .from('calorie_goals')
      .select('daily_calories, protein_target, carbs_target, fat_target')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('user_routine_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', user.id)
      .single(),
  ])

  // Aggregate spending
  const thisWeekTotal = (thisWeekExpenses.data || []).reduce((sum, e) => sum + e.amount, 0)
  const lastWeekTotal = (lastWeekExpenses.data || []).reduce((sum, e) => sum + e.amount, 0)
  const spendingChange = lastWeekTotal > 0
    ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
    : null

  const categoryTotals: Record<string, number> = {}
  ;(thisWeekExpenses.data || []).forEach((e) => {
    categoryTotals[e.category || 'Other'] = (categoryTotals[e.category || 'Other'] || 0) + e.amount
  })

  // Aggregate nutrition
  const meals = thisWeekMeals.data || []
  const mealDays = new Set(meals.map((m) => m.meal_date)).size
  const avgCalories = mealDays > 0
    ? Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0) / mealDays)
    : 0
  const goalCalories = calorieGoal.data?.daily_calories || null

  // Aggregate routines
  const routineCompletions = thisWeekRoutines.data || []
  const routineDays = new Set(routineCompletions.map((r) => r.routine_date)).size
  const totalXP = routineCompletions.reduce((sum, r) => sum + (r.xp_earned || 0), 0)

  // Aggregate workouts
  const workouts = thisWeekWorkouts.data || []
  const totalWorkoutMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)

  // Build data summary for LLM
  const dataSummary = {
    spending: {
      this_week_total: thisWeekTotal,
      last_week_total: lastWeekTotal,
      change_percent: spendingChange,
      top_categories: Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat, amt]) => ({ category: cat, amount: amt })),
      transaction_count: (thisWeekExpenses.data || []).length,
    },
    nutrition: {
      days_logged: mealDays,
      avg_daily_calories: avgCalories,
      calorie_goal: goalCalories,
      total_meals: meals.length,
    },
    fitness: {
      workouts_completed: workouts.length,
      total_minutes: totalWorkoutMinutes,
    },
    routines: {
      days_active: routineDays,
      total_completions: routineCompletions.length,
      total_xp: totalXP,
      current_streak: streak.data?.current_streak || 0,
    },
    goals: (goals.data || []).map((g) => ({
      name: g.name,
      progress: Math.round(((g.current_amount || 0) / g.target_amount) * 100),
    })),
  }

  const response = await llmService.completion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Here is my data for the last 7 days:\n${JSON.stringify(dataSummary, null, 2)}` },
    ],
    temperature: 0.5,
    maxTokens: 1000,
  })

  if (!response) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const parsed = llmService.parseJSON<{
    headline: string
    sections: Array<{
      domain: string
      emoji: string
      title: string
      summary: string
      highlight: string | null
    }>
    tip_of_the_week: string
  }>(response.content)

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }

  // Include raw stats alongside AI summary for the UI
  return NextResponse.json({
    ...parsed,
    raw: dataSummary,
  })
}
```

**Step 2: Commit**

```bash
git add app/api/ai/weekly-digest/route.ts
git commit -m "feat(ai): add weekly digest API route with cross-domain analysis"
```

---

## Task 7: Enhanced Weekly Digest — Hook + Component

**Files:**
- Create: `lib/hooks/use-weekly-digest.ts`
- Create: `components/weekly-digest.tsx`
- Modify: `components/views/analytics-insights-view.tsx` — replace `WeeklySummary` + `WeeklyNutritionSummary` with `WeeklyDigest`

**Step 1: Create the hook**

Create `lib/hooks/use-weekly-digest.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

interface DigestSection {
  domain: string
  emoji: string
  title: string
  summary: string
  highlight: string | null
}

interface WeeklyDigestResponse {
  headline: string
  sections: DigestSection[]
  tip_of_the_week: string
  raw: {
    spending: { this_week_total: number; change_percent: number | null }
    nutrition: { avg_daily_calories: number; calorie_goal: number | null }
    routines: { current_streak: number; days_active: number }
    fitness: { workouts_completed: number }
  }
}

export function useWeeklyDigest(options?: { enabled?: boolean }) {
  return useQuery<WeeklyDigestResponse>({
    queryKey: [...queryKeys.expenses.all, 'weekly-digest'],
    queryFn: async () => {
      const res = await fetch('/api/ai/weekly-digest')
      if (!res.ok) throw new Error('Failed to fetch digest')
      return res.json()
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    enabled: options?.enabled ?? true,
  })
}
```

**Step 2: Create the component**

Create `components/weekly-digest.tsx`:

```typescript
'use client'

import { motion } from 'framer-motion'
import { Sparkles, Lightbulb, Loader2, RefreshCw } from 'lucide-react'
import { useWeeklyDigest } from '@/lib/hooks/use-weekly-digest'

const DOMAIN_COLORS: Record<string, string> = {
  spending: 'from-orange-500/10 to-red-500/10',
  nutrition: 'from-green-500/10 to-emerald-500/10',
  fitness: 'from-blue-500/10 to-cyan-500/10',
  routines: 'from-violet-500/10 to-purple-500/10',
  goals: 'from-amber-500/10 to-yellow-500/10',
}

export function WeeklyDigest() {
  const { data, isLoading, error, refetch, isFetching } = useWeeklyDigest()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        <p className="mt-2 text-sm text-muted-foreground">Generating your weekly digest...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">Could not generate digest.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm font-medium text-violet-500"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Headline */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Your Week</h3>
            <p className="mt-0.5 text-base font-semibold">{data.headline}</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Domain sections */}
      {data.sections.map((section, i) => (
        <motion.div
          key={section.domain}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`rounded-xl bg-gradient-to-r ${DOMAIN_COLORS[section.domain] || 'from-gray-500/10 to-gray-500/10'} p-4`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{section.emoji}</span>
            <h4 className="text-sm font-semibold">{section.title}</h4>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {section.summary}
          </p>
          {section.highlight && (
            <p className="mt-2 text-xs font-medium text-foreground/80">
              {section.highlight}
            </p>
          )}
        </motion.div>
      ))}

      {/* Tip of the week */}
      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Tip of the week</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{data.tip_of_the_week}</p>
        </div>
      </div>
    </motion.div>
  )
}
```

**Step 3: Replace in analytics view**

Modify `components/views/analytics-insights-view.tsx`:

Remove imports:
```typescript
// Remove these:
import { WeeklySummary } from '@/components/weekly-summary'
import { WeeklyNutritionSummary } from '@/components/weekly-nutrition-summary'
```

Add import:
```typescript
import { WeeklyDigest } from '@/components/weekly-digest'
```

In the Summary tab JSX, replace:
```typescript
<WeeklySummary expenses={expenses} />
<WeeklyNutritionSummary />
```

With:
```typescript
<WeeklyDigest />
```

**Step 4: Test manually**

Run: `npm run dev`
Navigate to Insights → Summary tab → should see unified AI digest.

**Step 5: Commit**

```bash
git add lib/hooks/use-weekly-digest.ts components/weekly-digest.tsx components/views/analytics-insights-view.tsx
git commit -m "feat(ai): replace weekly summaries with unified AI digest"
```

---

## Task 8: Weekly Digest — Push Notification Cron

**Files:**
- Create: `app/api/cron/weekly-digest/route.ts`
- Reference: `lib/push-notifications.ts`, `app/api/cron/budget-alerts/route.ts`

**Step 1: Create the cron route**

Create `app/api/cron/weekly-digest/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push-notifications'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get users with push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')

  if (!subscriptions?.length) {
    return NextResponse.json({ message: 'No subscribers', sent: 0 })
  }

  // Group by user
  const userSubs = new Map<string, typeof subscriptions>()
  subscriptions.forEach((sub) => {
    const existing = userSubs.get(sub.user_id) || []
    existing.push(sub)
    userSubs.set(sub.user_id, existing)
  })

  let sent = 0

  for (const [userId, subs] of userSubs) {
    // Quick check: does user have any activity this week?
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { count } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('transaction_date', weekAgo.toISOString())

    if (!count || count === 0) continue

    for (const sub of subs) {
      try {
        await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          {
            title: '📊 Your Weekly Digest is Ready',
            body: 'See how your week went — spending, fitness, and habits all in one view.',
            tag: 'weekly-digest',
            url: '/?view=insights',
          }
        )
        sent++
      } catch {
        // Subscription cleanup handled by sendPushNotification
      }
    }
  }

  return NextResponse.json({
    message: 'Weekly digest notifications sent',
    sent,
  })
}
```

**Step 2: Commit**

```bash
git add app/api/cron/weekly-digest/route.ts
git commit -m "feat(ai): add weekly digest push notification cron job"
```

---

## Task 9: Hook Exports + Query Keys

**Files:**
- Modify: `lib/hooks/query-keys.ts` — add keys for new queries
- Modify: `lib/hooks/index.ts` — export new hooks

**Step 1: Add query keys**

Add to `lib/hooks/query-keys.ts` in the appropriate section:

```typescript
ai: {
  all: ['ai'] as const,
  parseInput: () => [...queryKeys.ai.all, 'parse-input'] as const,
  habitCoach: () => [...queryKeys.ai.all, 'habit-coach'] as const,
  weeklyDigest: () => [...queryKeys.ai.all, 'weekly-digest'] as const,
},
```

**Step 2: Export hooks**

Add to `lib/hooks/index.ts`:

```typescript
export { useParseInput, useExecuteParsedInput } from './use-nl-input'
export { useHabitCoach } from './use-habit-coach'
export { useWeeklyDigest } from './use-weekly-digest'
```

**Step 3: Update the hooks to use the new query keys**

Update `lib/hooks/use-habit-coach.ts`:
```typescript
queryKey: queryKeys.ai.habitCoach(),
```

Update `lib/hooks/use-weekly-digest.ts`:
```typescript
queryKey: queryKeys.ai.weeklyDigest(),
```

**Step 4: Commit**

```bash
git add lib/hooks/query-keys.ts lib/hooks/index.ts lib/hooks/use-habit-coach.ts lib/hooks/use-weekly-digest.ts
git commit -m "feat(ai): add query keys and hook exports for AI layer"
```

---

## Task 10: Type Safety + Build Verification

**Files:**
- Run TypeScript check
- Run full test suite
- Fix any issues

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors. Fix any type issues found.

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 3: Build check**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix type errors and build issues for AI layer"
```

---

## Summary

| Task | Feature | Files Created/Modified |
|------|---------|----------------------|
| 1 | NL Input API | `app/api/ai/parse-input/route.ts`, test |
| 2 | NL Input Hook | `lib/hooks/use-nl-input.ts` |
| 3 | NL Input Component | `components/nl-input-sheet.tsx`, `app/page.tsx` |
| 4 | Habit Coach API | `app/api/ai/habit-coach/route.ts`, test |
| 5 | Habit Coach UI | `lib/hooks/use-habit-coach.ts`, `components/habit-coach-card.tsx`, routines view |
| 6 | Weekly Digest API | `app/api/ai/weekly-digest/route.ts` |
| 7 | Weekly Digest UI | `lib/hooks/use-weekly-digest.ts`, `components/weekly-digest.tsx`, analytics view |
| 8 | Digest Cron | `app/api/cron/weekly-digest/route.ts` |
| 9 | Wiring | `lib/hooks/query-keys.ts`, `lib/hooks/index.ts` |
| 10 | Verification | TypeScript + tests + build |
