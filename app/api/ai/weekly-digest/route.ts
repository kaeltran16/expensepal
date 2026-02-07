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

export async function GET(_request: NextRequest) {
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
    cacheKey: `digest:${user.id}:${weekAgoStr}`,
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
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

  return NextResponse.json({
    ...parsed,
    raw: dataSummary,
  })
}
