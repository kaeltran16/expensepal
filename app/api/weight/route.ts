import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation, withAuthAndQueryValidation } from '@/lib/api/middleware'
import { CreateWeightLogSchema, WeightLogFiltersSchema } from '@/lib/api/schemas'

/**
 * GET /api/weight
 * Get weight logs with optional date range filter
 */
export const GET = withAuthAndQueryValidation(
  WeightLogFiltersSchema,
  async (request, user, filters) => {
    const supabase = createClient()

    let query = supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(filters.limit)

    if (filters.startDate) {
      query = query.gte('date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching weight logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch weight logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ weightLogs: data })
  }
)

/**
 * POST /api/weight
 * Log weight for a date (upsert - one entry per day)
 */
export const POST = withAuthAndValidation(
  CreateWeightLogSchema,
  async (request, user, data) => {
    const supabase = createClient()

    // Upsert: insert or update if exists for this date
    const { data: weightLog, error } = await supabase
      .from('weight_logs')
      .upsert(
        {
          user_id: user.id,
          weight: data.weight,
          date: data.date,
          notes: data.notes || null,
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error logging weight:', error)
      return NextResponse.json(
        { error: 'Failed to log weight' },
        { status: 500 }
      )
    }

    return NextResponse.json(weightLog)
  }
)
