import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { z } from 'zod'

/**
 * Higher-order function that wraps API route handlers with authentication
 * Reduces boilerplate code and ensures consistent error handling across all routes
 *
 * @example
 * ```typescript
 * // Before (with boilerplate):
 * export async function GET(request: NextRequest) {
 *   const supabase = createClient()
 *   const { data: { user }, error } = await supabase.auth.getUser()
 *   if (error || !user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *   // ... handler logic
 * }
 *
 * // After (with middleware):
 * export const GET = withAuth(async (request, user) => {
 *   // ... handler logic (user is guaranteed to exist)
 * })
 * ```
 */
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

      // Call the actual handler with authenticated user
      return await handler(request, user)
    } catch (error) {
      console.error('API Error:', error)

      // Return appropriate error response
      const message = error instanceof Error ? error.message : 'Internal server error'
      return NextResponse.json(
        { error: message },
        { status: 500 }
      )
    }
  }
}

/**
 * Alternative middleware that allows optional authentication
 * Passes null for user if not authenticated, allowing public + private routes
 *
 * @example
 * ```typescript
 * export const GET = withOptionalAuth(async (request, user) => {
 *   if (user) {
 *     // Return personalized data
 *   } else {
 *     // Return public data
 *   }
 * })
 * ```
 */
export function withOptionalAuth(
  handler: (request: NextRequest, user: User | null) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Call handler regardless of auth status
      return await handler(request, user)
    } catch (error) {
      console.error('API Error:', error)

      const message = error instanceof Error ? error.message : 'Internal server error'
      return NextResponse.json(
        { error: message },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware for handling common HTTP methods with auth
 * Automatically returns 405 Method Not Allowed for unsupported methods
 *
 * @example
 * ```typescript
 * export const { GET, POST } = withMethods({
 *   GET: async (request, user) => {
 *     // Handle GET
 *   },
 *   POST: async (request, user) => {
 *     // Handle POST
 *   }
 * })
 * ```
 */
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

/**
 * Middleware that combines authentication with request body validation
 * Validates request body against a Zod schema before calling the handler
 *
 * @example
 * ```typescript
 * export const POST = withAuthAndValidation(
 *   CreateExpenseSchema,
 *   async (request, user, validatedData) => {
 *     // validatedData is type-safe and validated
 *     const expense = await createExpense(user.id, validatedData)
 *     return NextResponse.json({ expense })
 *   }
 * )
 * ```
 */
export function withAuthAndValidation<T extends z.ZodType>(
  schema: T,
  handler: (request: NextRequest, user: User, validatedData: z.infer<T>) => Promise<Response>
) {
  return withAuth(async (request, user) => {
    try {
      // Parse and validate request body
      const body = await request.json()
      const validatedData = schema.parse(body)

      // Call handler with validated data
      return await handler(request, user, validatedData)
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        )
      }

      // Re-throw other errors to be caught by withAuth
      throw error
    }
  })
}

/**
 * Middleware for validating query parameters
 * Validates URL search params against a Zod schema
 *
 * @example
 * ```typescript
 * export const GET = withAuthAndQueryValidation(
 *   ExpenseFiltersSchema,
 *   async (request, user, filters) => {
 *     // filters are type-safe and validated
 *     const expenses = await getExpenses(user.id, filters)
 *     return NextResponse.json({ expenses })
 *   }
 * )
 * ```
 */
export function withAuthAndQueryValidation<T extends z.ZodType>(
  schema: T,
  handler: (request: NextRequest, user: User, validatedParams: z.infer<T>) => Promise<Response>
) {
  return withAuth(async (request, user) => {
    try {
      // Extract and validate query parameters
      const { searchParams } = new URL(request.url)
      const params = Object.fromEntries(searchParams.entries())
      const validatedParams = schema.parse(params)

      // Call handler with validated params
      return await handler(request, user, validatedParams)
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        )
      }

      // Re-throw other errors to be caught by withAuth
      throw error
    }
  })
}
