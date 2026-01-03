/**
 * Supabase Client Mocks
 *
 * Provides mock implementations for Supabase client operations.
 * Includes mock data factories for common database types.
 */

import type { Budget, Expense, Meal, Workout, WorkoutTemplate } from '@/lib/supabase'
import { vi } from 'vitest'

// Mock user for auth
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
}

// Mock session
export const mockSession = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser,
}

// Query builder chain mock
const createQueryBuilderMock = () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    // Return data/error - can be overridden in tests
    then: vi.fn((resolve) =>
      resolve({ data: [], error: null, count: null, status: 200, statusText: 'OK' })
    ),
  }
  return chain
}

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: mockSession, user: mockUser }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://oauth.example.com' }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn((_callback) => {
      // Return unsubscribe function
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
    refreshSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
  },
  from: vi.fn((_table: string) => createQueryBuilderMock()),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: vi.fn((_bucket: string) => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } })),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
  channel: vi.fn((_name: string) => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
    unsubscribe: vi.fn(),
  })),
}

// Mock the Supabase module
vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual('@/lib/supabase')
  return {
    ...actual,
    supabase: mockSupabaseClient,
    supabaseAdmin: mockSupabaseClient,
  }
})

// Mock @supabase/ssr for server-side rendering
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => mockSupabaseClient),
  createServerClient: vi.fn(() => mockSupabaseClient),
}))

// ============================================================
// Mock Data Factories
// ============================================================

/**
 * Create a mock Expense
 * Uses actual database schema field names: transaction_date, currency, source
 */
export function createMockExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: `expense-${Math.random().toString(36).slice(2)}`,
    user_id: mockUser.id,
    amount: 50000,
    category: 'Food',
    merchant: 'Test Merchant',
    notes: null,
    transaction_date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: 'manual',
    currency: 'VND',
    email_subject: null,
    transaction_type: null,
    ...overrides,
  }
}

/**
 * Create a mock Budget
 */
export function createMockBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: `budget-${Math.random().toString(36).slice(2)}`,
    user_id: mockUser.id,
    category: 'Food',
    amount: 2000000,
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock Meal
 * Uses actual database schema field names: meal_date
 */
export function createMockMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: `meal-${Math.random().toString(36).slice(2)}`,
    user_id: mockUser.id,
    name: 'Test Meal',
    calories: 500,
    protein: 25,
    carbs: 50,
    fat: 15,
    meal_time: 'lunch',
    meal_date: new Date().toISOString().slice(0, 10),
    expense_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: 'manual',
    confidence: null,
    llm_reasoning: null,
    ...overrides,
  }
}

/**
 * Create a mock Workout
 * Uses actual database schema: no 'name' field on workouts
 */
export function createMockWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: `workout-${Math.random().toString(36).slice(2)}`,
    user_id: mockUser.id,
    template_id: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    duration_minutes: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scheduled_date: null,
    total_sets: null,
    total_volume: null,
    total_weight_lifted: null,
    workout_date: new Date().toISOString().slice(0, 10),
    ...overrides,
  }
}

/**
 * Create a mock WorkoutTemplate
 */
export function createMockWorkoutTemplate(
  overrides: Partial<WorkoutTemplate> = {}
): WorkoutTemplate {
  return {
    id: `template-${Math.random().toString(36).slice(2)}`,
    user_id: mockUser.id,
    name: 'Test Template',
    exercises: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: null,
    difficulty: null,
    duration_minutes: null,
    is_default: null,
    last_used_at: null,
    use_count: null,
    ...overrides,
  }
}

/**
 * Helper to set up mock query responses
 */
export function mockSupabaseQuery(
  table: string,
  data: unknown[],
  error: { message: string; code: string } | null = null
) {
  const queryBuilder = createQueryBuilderMock()
  queryBuilder.then = vi.fn((resolve) =>
    resolve({ data, error, count: data.length, status: error ? 500 : 200, statusText: error ? 'Error' : 'OK' })
  )
  mockSupabaseClient.from.mockImplementation((t: string) => {
    if (t === table) return queryBuilder
    return createQueryBuilderMock()
  })
  return queryBuilder
}

// Export mock utilities
export { createQueryBuilderMock }

