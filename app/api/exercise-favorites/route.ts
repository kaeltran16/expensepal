import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/exercise-favorites
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: favorites, error } = await supabase
      .from('exercise_favorites')
      .select(`
        *,
        exercise:exercises(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching exercise favorites:', error)
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      )
    }

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/exercise-favorites
export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { exercise_id } = body

    if (!exercise_id) {
      return NextResponse.json(
        { error: 'exercise_id is required' },
        { status: 400 }
      )
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('exercise_favorites')
      .select('exercise_id')
      .eq('user_id', user.id)
      .eq('exercise_id', exercise_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Exercise already favorited' },
        { status: 409 }
      )
    }

    const { data: favorite, error } = await supabase
      .from('exercise_favorites')
      .insert({
        user_id: user.id,
        exercise_id
      })
      .select(`
        *,
        exercise:exercises(*)
      `)
      .single()

    if (error) {
      console.error('Error adding favorite:', error)
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ favorite }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/exercise-favorites?exercise_id=...
export async function DELETE(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const exercise_id = searchParams.get('exercise_id')

    if (!exercise_id) {
      return NextResponse.json(
        { error: 'exercise_id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('exercise_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('exercise_id', exercise_id)

    if (error) {
      console.error('Error removing favorite:', error)
      return NextResponse.json(
        { error: 'Failed to remove favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
