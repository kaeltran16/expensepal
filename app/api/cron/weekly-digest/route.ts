import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

  let sent = 0
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  for (const profile of profiles) {
    // Quick check: does user have any activity this week?
    const { count } = await supabaseAdmin
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.user_id)
      .gte('transaction_date', weekAgo.toISOString())

    if (!count || count === 0) continue

    const result = await sendPushNotification(profile.user_id, {
      title: 'Your Weekly Digest is Ready',
      body: 'See how your week went — spending, fitness, and habits all in one view.',
      tag: 'weekly-digest',
      url: '/?view=insights',
    })

    sent += result.sent
  }

  return NextResponse.json({
    message: 'Weekly digest notifications sent',
    sent,
  })
}
