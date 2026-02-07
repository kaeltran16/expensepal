import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm-service'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are an input classifier for a personal finance and fitness app. Given a natural language input, classify it into one of these intents and extract structured data.

Intents and their EXACT required fields:

1. "expense" — user is logging a purchase or spending.
   Required fields in "data":
   - "amount": number (MUST be a raw number, e.g. 45000 not "45k")
   - "merchant": string (the store/vendor/item name)
   - "category": string (one of: Food, Transport, Shopping, Entertainment, Bills, Health, Other)
   - "currency": string (default "VND")
   - "transaction_date": ISO string (default today)
   Rules: "k" means thousand (45k = 45000), "m" or "tr" means million (1.5m = 1500000). Infer category from context (coffee/restaurant → Food, grab/taxi → Transport, etc.)

2. "meal" — user is logging food they ate.
   Required fields in "data":
   - "name": string (the food name)
   - "meal_time": "breakfast" | "lunch" | "dinner" | "snack"
   - "calories": number or null
   - "protein": number or null
   - "carbs": number or null
   - "fat": number or null

3. "routine" — user is logging a routine/habit completion. Fields: "routine_name" (string), "completed" (boolean), "notes" (string or null).

4. "goal" — user is contributing to a savings goal. Fields: "goal_name" (string), "amount" (number).

5. "unknown" — cannot determine intent.

Respond with ONLY valid JSON using these EXACT field names:
{"intent":"expense","confidence":0.9,"data":{"amount":45000,"merchant":"Coffee shop","category":"Food","currency":"VND"},"display_text":"Coffee shop — 45,000 VND"}

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
    cacheKey: `parse:${input.toLowerCase()}`,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
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
