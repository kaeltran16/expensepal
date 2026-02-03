import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/routine-templates/[id] - get a single template
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()

    const { data, error } = await supabase
      .from('routine_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching routine template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template: data })
  })(request)
}

// PUT /api/routine-templates/[id] - update a template
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()
    const body = await req.json()

    // Verify ownership (RLS should handle this, but double-check)
    const { data: existing } = await supabase
      .from('routine_templates')
      .select('user_id, is_default')
      .eq('id', id)
      .single()

    if (!existing || (existing.user_id !== user.id && !existing.is_default)) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existing.is_default) {
      return NextResponse.json({ error: 'Cannot modify default templates' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('routine_templates')
      .update({
        name: body.name,
        description: body.description,
        icon: body.icon,
        time_of_day: body.time_of_day,
        estimated_minutes: body.estimated_minutes,
        steps: body.steps,
        tags: body.tags,
        frequency: body.frequency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating routine template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  })(request)
}

// DELETE /api/routine-templates/[id] - delete a template
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()

    // Verify ownership
    const { data: existing } = await supabase
      .from('routine_templates')
      .select('user_id, is_default')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existing.is_default) {
      return NextResponse.json({ error: 'Cannot delete default templates' }, { status: 403 })
    }

    const { error } = await supabase
      .from('routine_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting routine template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  })(request)
}
