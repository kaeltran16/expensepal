import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withOptionalAuth } from '@/lib/api/middleware'

export const dynamic = 'force-dynamic'

export const GET = withOptionalAuth(async (request: NextRequest, _user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  let query = supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch exercises:', error)
    throw new Error('Failed to fetch exercises')
  }

  return NextResponse.json({
    exercises: data || [],
  })
})
