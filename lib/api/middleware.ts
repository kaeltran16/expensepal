import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Internal server error'
}

export function withAuth(
  handler: (request: NextRequest, user: User) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      return await handler(request, user)
    } catch (error) {
      console.error('API Error:', error)
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      )
    }
  }
}

export function withOptionalAuth(
  handler: (request: NextRequest, user: User | null) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      return await handler(request, user)
    } catch (error) {
      console.error('API Error:', error)
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      )
    }
  }
}

export function withMethods(handlers: {
  GET?: (request: NextRequest, user: User) => Promise<Response>
  POST?: (request: NextRequest, user: User) => Promise<Response>
  PUT?: (request: NextRequest, user: User) => Promise<Response>
  DELETE?: (request: NextRequest, user: User) => Promise<Response>
  PATCH?: (request: NextRequest, user: User) => Promise<Response>
}) {
  const wrapped: Record<string, (request: NextRequest) => Promise<Response>> = {}

  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      wrapped[method] = withAuth(handler)
    }
  }

  return wrapped
}

function formatZodError(error: z.ZodError, label: string) {
  return NextResponse.json(
    {
      error: label,
      details: error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    },
    { status: 400 }
  )
}

export function withAuthAndValidation<T extends z.ZodType>(
  schema: T,
  handler: (request: NextRequest, user: User, validatedData: z.infer<T>) => Promise<Response>
) {
  return withAuth(async (request, user) => {
    try {
      const body = await request.json()
      const validatedData = schema.parse(body)
      return await handler(request, user, validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) return formatZodError(error, 'Validation failed')
      throw error
    }
  })
}

export function withAuthAndQueryValidation<T extends z.ZodType>(
  schema: T,
  handler: (request: NextRequest, user: User, validatedParams: z.infer<T>) => Promise<Response>
) {
  return withAuth(async (request, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const params = Object.fromEntries(searchParams.entries())
      const validatedParams = schema.parse(params)
      return await handler(request, user, validatedParams)
    } catch (error) {
      if (error instanceof z.ZodError) return formatZodError(error, 'Invalid query parameters')
      throw error
    }
  })
}

export function withAuthParamsAndValidation<TParams, TSchema extends z.ZodType>(
  schema: TSchema,
  handler: (
    request: NextRequest,
    user: User,
    params: TParams,
    validatedData: z.infer<TSchema>
  ) => Promise<Response>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ) => {
    const resolvedParams = await context.params
    return withAuthAndValidation(schema, async (req, user, validatedData) => {
      return handler(req, user, resolvedParams, validatedData)
    })(request)
  }
}

export function withAuthParams<TParams>(
  handler: (request: NextRequest, user: User, params: TParams) => Promise<Response>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ) => {
    const resolvedParams = await context.params
    return withAuth((req, user) => handler(req, user, resolvedParams))(request)
  }
}
