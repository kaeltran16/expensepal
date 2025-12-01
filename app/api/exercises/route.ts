import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/exercises - list all exercises (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = supabaseAdmin
      .from('exercises')
      .select('*')
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('error fetching exercises:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      exercises: data || [],
    })
  } catch (error) {
    console.error('error in GET /api/exercises:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}
