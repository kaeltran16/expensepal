'use client'

import { useMutation } from '@tanstack/react-query'
import { useCreateExpenseOptimistic } from './use-expenses'
import { useCreateMealOptimistic } from './use-meals'

interface ParsedInput {
  intent: 'expense' | 'meal' | 'routine' | 'goal' | 'unknown'
  confidence: number
  data: Record<string, unknown>
  display_text: string
}

/** Normalize amount: handle strings, "k" suffix, commas, etc. */
function normalizeAmount(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val !== 'string') return 0
  let s = val.replace(/,/g, '').trim().toLowerCase()
  let multiplier = 1
  if (s.endsWith('k')) {
    multiplier = 1000
    s = s.slice(0, -1)
  } else if (s.endsWith('m') || s.endsWith('tr')) {
    multiplier = 1000000
    s = s.replace(/tr$|m$/, '')
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n * multiplier
}

/** Pick first truthy value from a record by trying multiple keys */
function pick(data: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (data[key] != null && data[key] !== '') return data[key]
  }
  return undefined
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
  const createMeal = useCreateMealOptimistic()

  return useMutation({
    mutationFn: async (parsed: ParsedInput) => {
      const { intent, data } = parsed

      switch (intent) {
        case 'expense': {
          const amount = normalizeAmount(pick(data, 'amount', 'price', 'cost', 'total'))
          const merchant = String(pick(data, 'merchant', 'merchant_name', 'store', 'vendor', 'name', 'item') || '')

          if (!amount || !merchant) {
            throw new Error('Could not extract amount or merchant from input')
          }

          return createExpense.mutateAsync({
            amount,
            merchant,
            category: String(pick(data, 'category', 'type') || 'Other'),
            currency: String(pick(data, 'currency') || 'VND'),
            transaction_date: String(pick(data, 'transaction_date', 'date') || new Date().toISOString()),
            transaction_type: 'Expense',
            source: 'ai',
          })
        }

        case 'meal': {
          const name = String(pick(data, 'name', 'food', 'meal', 'item', 'dish') || '')

          if (!name) {
            throw new Error('Could not extract meal name from input')
          }

          return createMeal.mutateAsync({
            name,
            meal_time: String(pick(data, 'meal_time', 'mealTime', 'time') || 'snack'),
            meal_date: new Date().toISOString().split('T')[0],
            calories: data.calories as number | undefined,
            protein: data.protein as number | undefined,
            carbs: data.carbs as number | undefined,
            fat: data.fat as number | undefined,
            source: 'llm',
            estimate: !data.calories,
          })
        }

        case 'goal':
          return { intent: 'goal', data }

        case 'routine':
          return { intent: 'routine', data }

        default:
          throw new Error(`Unknown intent: ${intent}`)
      }
    },
  })
}
