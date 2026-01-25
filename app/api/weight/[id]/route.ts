import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'

/**
 * DELETE /api/weight/[id]
 * Delete a weight log entry
 */
export const DELETE = withAuth(async (request: NextRequest, user) => {
  const id = request.url.split('/').pop()

  if (!id) {
    return NextResponse.json({ error: 'Weight log ID is required' }, { status: 400 })
  }

  const supabase = createClient()

  const { error } = await supabase
    .from('weight_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting weight log:', error)
    return NextResponse.json(
      { error: 'Failed to delete weight log' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
})
