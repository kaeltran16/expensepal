import { NextResponse } from 'next/server'
import { withAuthAndValidation } from '@/lib/api/middleware'
import { llmService } from '@/lib/llm-service'
import { z } from 'zod'

export const runtime = 'edge'

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
