import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { UpdateWaterLogSchema, AddWaterSchema } from '@/lib/api/schemas'

// Helper to get today's date in user's timezone
function getTodayDate(timezoneOffset?: number): string {
  const now = new Date()
  if (timezoneOffset !== undefined) {
    // Adjust for timezone offset (offset is in minutes, negative for GMT+)
    const adjusted = new Date(now.getTime() - timezoneOffset * 60000)
    return adjusted.toISOString().split('T')[0]
  }
  return now.toISOString().split('T')[0]
}

/**
 * GET /api/water
 * Get water log for today (or specified date)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  const timezoneOffset = searchParams.get('timezoneOffset')

  const date = dateParam || getTodayDate(timezoneOffset ? parseInt(timezoneOffset) : undefined)

  const supabase = createClient()

  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    console.error('Error fetching water log:', error)
    return NextResponse.json(
      { error: 'Failed to fetch water log' },
      { status: 500 }
    )
  }

  // Also get user's daily water goal
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('daily_water_goal_ml')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    waterLog: data || { amount_ml: 0, date },
    daily_goal_ml: profile?.daily_water_goal_ml || 2000,
  })
})

/**
 * POST /api/water
 * Add water intake (increment) for today
 */
export const POST = withAuthAndValidation(
  AddWaterSchema,
  async (request, user, data) => {
    const date = data.date || getTodayDate(data.timezoneOffset)
    const supabase = createClient()

    // First, get current amount
    const { data: existing } = await supabase
      .from('water_logs')
      .select('id, amount_ml')
      .eq('user_id', user.id)
      .eq('date', date)
      .single()

    let result
    if (existing) {
      // Update existing entry
      const newAmount = existing.amount_ml + data.amount_ml
      const { data: updated, error } = await supabase
        .from('water_logs')
        .update({ amount_ml: newAmount })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating water log:', error)
        return NextResponse.json(
          { error: 'Failed to update water log' },
          { status: 500 }
        )
      }
      result = updated
    } else {
      // Create new entry
      const { data: created, error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: data.amount_ml,
          date,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating water log:', error)
        return NextResponse.json(
          { error: 'Failed to create water log' },
          { status: 500 }
        )
      }
      result = created
    }

    return NextResponse.json(result)
  }
)

/**
 * PUT /api/water
 * Set specific water amount for today (or subtract)
 */
export const PUT = withAuthAndValidation(
  UpdateWaterLogSchema,
  async (request, user, data) => {
    const date = data.date || getTodayDate(data.timezoneOffset)
    const supabase = createClient()

    // Upsert: insert or update
    const { data: waterLog, error } = await supabase
      .from('water_logs')
      .upsert(
        {
          user_id: user.id,
          amount_ml: data.amount_ml,
          date,
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error setting water log:', error)
      return NextResponse.json(
        { error: 'Failed to set water log' },
        { status: 500 }
      )
    }

    return NextResponse.json(waterLog)
  }
)
