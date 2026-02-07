import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push-notifications'
import { isScheduledForDate } from '@/lib/utils/routine-scheduling'
import { getTodayInGMT7, getNowInGMT7 } from '@/lib/timezone'
import type { TimeOfDay } from '@/lib/types/routines'

export const dynamic = 'force-dynamic'

const TIME_SLOT_MAP: Record<string, TimeOfDay[]> = {
  morning: ['morning', 'afternoon'],
  evening: ['evening', 'night'],
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const timeSlot = searchParams.get('timeSlot') as 'morning' | 'evening'

  if (!timeSlot || !TIME_SLOT_MAP[timeSlot]) {
    return NextResponse.json({ error: 'Invalid timeSlot parameter' }, { status: 400 })
  }

  const timeOfDayValues = TIME_SLOT_MAP[timeSlot]
  const today = getTodayInGMT7()
  const todayDate = getNowInGMT7()

  // Fetch all templates matching these time_of_day values
  const { data: templates } = await supabaseAdmin
    .from('routine_templates')
    .select('*')
    .in('time_of_day', timeOfDayValues)

  if (!templates || templates.length === 0) {
    return NextResponse.json({ message: 'No templates found for this time slot', sent: 0 })
  }

  // Fetch today's completions to skip already-done routines
  const { data: completions } = await supabaseAdmin
    .from('routine_completions')
    .select('template_id, user_id')
    .eq('routine_date', today)

  const completedSet = new Set(
    (completions || []).map((c: { user_id: string; template_id: string | null }) => `${c.user_id}:${c.template_id}`)
  )

  let sent = 0

  for (const template of templates) {
    // Check if template is scheduled for today
    if (!isScheduledForDate(template.frequency, todayDate)) {
      continue
    }

    // Skip if user already completed this routine today
    if (!template.user_id || completedSet.has(`${template.user_id}:${template.id}`)) {
      continue
    }

    try {
      await sendPushNotification(template.user_id, {
        title: `${template.icon || '⏰'} Time for ${template.name}`,
        body: `Your ${template.time_of_day} routine is waiting!`,
        tag: `routine-reminder-${template.id}`,
        url: '/',
      })
      sent++
    } catch (error) {
      console.error(`Failed to send reminder for template ${template.id}:`, error)
    }
  }

  // Streak-at-risk warnings (evening slot only)
  let streakWarnings = 0
  if (timeSlot === 'evening') {
    const { data: streaks } = await supabaseAdmin
      .from('user_routine_streaks')
      .select('user_id, current_streak')
      .gte('current_streak', 3)

    if (streaks && streaks.length > 0) {
      // Find users who haven't completed ANY routine today
      const usersWithCompletions = new Set(
        (completions || []).map((c: { user_id: string }) => c.user_id)
      )

      for (const streak of streaks) {
        if (!streak.user_id || usersWithCompletions.has(streak.user_id)) {
          continue
        }

        try {
          await sendPushNotification(streak.user_id, {
            title: 'Streak at risk!',
            body: `Don't lose your ${streak.current_streak}-day streak!`,
            tag: 'streak-warning',
            url: '/',
          })
          streakWarnings++
        } catch (error) {
          console.error(`Failed to send streak warning for user ${streak.user_id}:`, error)
        }
      }
    }
  }

  return NextResponse.json({
    message: `Routine reminders sent for ${timeSlot} slot`,
    sent,
    streakWarnings,
  })
}
