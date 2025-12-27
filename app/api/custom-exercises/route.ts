import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/custom-exercises
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: customExercises, error } = await supabase
      .from('custom_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching custom exercises:', error)
      return NextResponse.json(
        { error: 'Failed to fetch custom exercises' },
        { status: 500 }
      )
    }

    return NextResponse.json({ customExercises })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/custom-exercises
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
    const {
      name,
      description,
      muscle_groups,
      equipment,
      difficulty,
      video_url,
      image_url,
      instructions,
      tips
    } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const { data: customExercise, error } = await supabase
      .from('custom_exercises')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description,
        muscle_groups: muscle_groups || [],
        equipment,
        difficulty,
        video_url,
        image_url,
        instructions,
        tips
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom exercise:', error)
      return NextResponse.json(
        { error: 'Failed to create custom exercise' },
        { status: 500 }
      )
    }

    return NextResponse.json({ customExercise }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/custom-exercises?id=...
export async function PUT(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      muscle_groups,
      equipment,
      difficulty,
      video_url,
      image_url,
      instructions,
      tips
    } = body

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('custom_exercises')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Custom exercise not found' },
        { status: 404 }
      )
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description
    if (muscle_groups !== undefined) updates.muscle_groups = muscle_groups
    if (equipment !== undefined) updates.equipment = equipment
    if (difficulty !== undefined) updates.difficulty = difficulty
    if (video_url !== undefined) updates.video_url = video_url
    if (image_url !== undefined) updates.image_url = image_url
    if (instructions !== undefined) updates.instructions = instructions
    if (tips !== undefined) updates.tips = tips

    const { data: customExercise, error } = await supabase
      .from('custom_exercises')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating custom exercise:', error)
      return NextResponse.json(
        { error: 'Failed to update custom exercise' },
        { status: 500 }
      )
    }

    return NextResponse.json({ customExercise })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/custom-exercises?id=...
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('custom_exercises')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Custom exercise not found' },
        { status: 404 }
      )
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('custom_exercises')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting custom exercise:', error)
      return NextResponse.json(
        { error: 'Failed to delete custom exercise' },
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
