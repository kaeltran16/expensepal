import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm-service'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are a personal assistant providing brief, contextual annotations for a daily dashboard. Given the user's current data snapshot, generate one short annotation per card.

Return JSON:
{
  "spending": "One sentence about their spending today/this week (max 20 words)",
  "calories": "One sentence about their nutrition/hydration (max 20 words)",
  "routine": "One sentence about their routine streak/progress (max 20 words)"
}

Rules:
- Be specific with numbers from the data
- Be warm and motivating, not judgmental
- If a metric is doing well, acknowledge it
- If something needs attention (streak at risk, over budget), gently nudge
- Keep each annotation to ONE short sentence
- Do not use emoji`

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
  const todayStr = now.toISOString().split('T')[0]
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const currentMonth = now.toISOString().slice(0, 7)

  const [
    todayExpenses,
    weekExpenses,
    monthExpenses,
    budgets,
    todayMeals,
    calorieGoal,
    waterLog,
    userProfile,
    routineStreak,
    routineStats,
    todayRoutines,
  ] = await Promise.all([
    supabase.from('expenses').select('amount').eq('user_id', user.id)
      .gte('transaction_date', todayStart),
    supabase.from('expenses').select('amount').eq('user_id', user.id)
      .gte('transaction_date', weekStart.toISOString()),
    supabase.from('expenses').select('amount').eq('user_id', user.id)
      .gte('transaction_date', monthStart),
    supabase.from('budgets').select('amount, category').eq('user_id', user.id)
      .eq('month', currentMonth),
    supabase.from('meals').select('calories').eq('user_id', user.id)
      .eq('meal_date', todayStr),
    supabase.from('calorie_goals').select('daily_calories').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('water_logs').select('amount_ml').eq('user_id', user.id)
      .eq('date', todayStr).single(),
    supabase.from('user_profiles').select('daily_water_goal_ml').eq('user_id', user.id)
      .single(),
    supabase.from('user_routine_streaks').select('current_streak, longest_streak')
      .eq('user_id', user.id).single(),
    supabase.from('user_routine_stats').select('total_xp, current_level')
      .eq('user_id', user.id).single(),
    supabase.from('routine_completions').select('id').eq('user_id', user.id)
      .eq('routine_date', todayStr),
  ])

  const todayTotal = (todayExpenses.data || []).reduce((s, e) => s + e.amount, 0)
  const weekTotal = (weekExpenses.data || []).reduce((s, e) => s + e.amount, 0)
  const monthTotal = (monthExpenses.data || []).reduce((s, e) => s + e.amount, 0)
  const totalBudget = (budgets.data || []).reduce((s, b) => s + b.amount, 0)
  const budgetUsedPct = totalBudget > 0 ? Math.round((monthTotal / totalBudget) * 100) : null

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - now.getDate()
  const dailyAllowance = totalBudget > 0 && daysRemaining > 0
    ? Math.round((totalBudget - monthTotal) / daysRemaining)
    : null

  const todayCalories = (todayMeals.data || []).reduce((s, m) => s + (m.calories || 0), 0)
  const calGoal = calorieGoal.data?.daily_calories || null

  const snapshot = {
    spending: {
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      budget_total: totalBudget,
      budget_used_pct: budgetUsedPct,
      daily_allowance: dailyAllowance,
    },
    nutrition: {
      calories_today: todayCalories,
      calorie_goal: calGoal,
      water_ml: waterLog.data?.amount_ml || 0,
      water_goal_ml: userProfile.data?.daily_water_goal_ml || 2000,
    },
    routine: {
      completed_today: (todayRoutines.data || []).length > 0,
      current_streak: routineStreak.data?.current_streak || 0,
      longest_streak: routineStreak.data?.longest_streak || 0,
      current_level: routineStats.data?.current_level || 1,
      total_xp: routineStats.data?.total_xp || 0,
    },
    time_of_day: now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening',
  }

  const response = await llmService.completion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Current state:\n${JSON.stringify(snapshot, null, 2)}` },
    ],
    temperature: 0.6,
    maxTokens: 300,
    cacheKey: `feed-annotations:${user.id}:${todayStr}:${now.getHours() < 12 ? 'am' : 'pm'}`,
    cacheTTL: 6 * 60 * 60 * 1000,
  })

  if (!response) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }

  const parsed = llmService.parseJSON<{
    spending: string
    calories: string
    routine: string
  }>(response.content)

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }

  return NextResponse.json(parsed)
}
