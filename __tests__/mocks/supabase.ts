import { vi } from 'vitest'

// Mock data for testing
export const mockExpenseInsert = vi.fn()
export const mockMealInsert = vi.fn()

// Mock Supabase client
export const mockSupabaseAdmin = {
  from: vi.fn((table: string) => {
    if (table === 'expenses') {
      return {
        insert: mockExpenseInsert.mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'expense-123' }],
            error: null,
          }),
        }),
      }
    }
    if (table === 'meals') {
      return {
        insert: mockMealInsert.mockReturnValue({
          error: null,
        }),
      }
    }
    return {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }
  }),
}

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}))
