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

export async function GET(_request: NextRequest) {
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
    cacheKey: `coach:${user.id}:${analysisData.total_completions}:${analysisData.current_streak}`,
    cacheTTL: 60 * 60 * 1000, // 1 hour
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
