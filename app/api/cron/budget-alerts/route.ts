import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push-notifications'
import { calculateBudgetPredictions } from '@/lib/analytics/budget-predictions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all users with notifications enabled
  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('notification_enabled', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: 'No users with notifications enabled', sent: 0 })
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0]

  let totalSent = 0

  // Process users sequentially to stay within Vercel function limits
  for (const profile of profiles) {
    try {
      // Fetch budgets for current month
      const { data: budgets } = await supabaseAdmin
        .from('budgets')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('month', currentMonth)

      if (!budgets || budgets.length === 0) continue

      // Fetch expenses for last 3 months
      const { data: expenses } = await supabaseAdmin
        .from('expenses')
        .select('*')
        .eq('user_id', profile.user_id)
        .gte('transaction_date', threeMonthsAgoStr)

      if (!expenses) continue

      const predictions = calculateBudgetPredictions(expenses, budgets, currentMonth)

      for (const prediction of predictions) {
        if (prediction.status === 'exceeded') {
          await sendPushNotification(profile.user_id, {
            title: 'Budget Exceeded!',
            body: `Your ${prediction.category} budget is exceeded - ${prediction.message}`,
            tag: `budget-daily-${prediction.category}`,
            url: '/',
          })
          totalSent++
        } else if (prediction.status === 'danger') {
          await sendPushNotification(profile.user_id, {
            title: 'Budget at Risk',
            body: `${prediction.category}: ${prediction.message}`,
            tag: `budget-daily-${prediction.category}`,
            url: '/',
          })
          totalSent++
        }
      }
    } catch (error) {
      console.error(`Failed to process budget alerts for user ${profile.user_id}:`, error)
    }
  }

  return NextResponse.json({
    message: 'Budget alert cron completed',
    usersProcessed: profiles.length,
    sent: totalSent,
  })
}
