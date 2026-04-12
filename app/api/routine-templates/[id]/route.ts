import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { UpdateRoutineTemplateSchema } from '@/lib/api/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

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
      console.error('Failed to fetch routine template:', error)
      return NextResponse.json({ error: 'Failed to fetch routine template' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template: data })
  })(request)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateRoutineTemplateSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data: existing } = await supabase
        .from('routine_templates')
        .select('user_id, is_default')
        .eq('id', params.id)
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
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update routine template:', error)
        throw new Error('Failed to update routine template')
      }

      return NextResponse.json({ template: data })
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParams(async (req, user, params: { id: string }) => {
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('routine_templates')
      .select('user_id, is_default')
      .eq('id', params.id)
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
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete routine template:', error)
      throw new Error('Failed to delete routine template')
    }

    return NextResponse.json({ success: true })
  })(request, context)
}
