/**
 * TanStack Query Mocks
 *
 * Provides mock implementations for useQuery, useMutation, and useQueryClient.
 * These mocks allow tests to control query/mutation behavior without actual API calls.
 */

import { vi } from 'vitest'

// Types for mock configuration
export interface MockQueryOptions<TData = unknown> {
  data?: TData
  isLoading?: boolean
  isPending?: boolean
  isError?: boolean
  error?: Error | null
  isFetching?: boolean
  isRefetching?: boolean
  isSuccess?: boolean
  refetch?: ReturnType<typeof vi.fn>
  fetchStatus?: 'fetching' | 'idle' | 'paused'
}

export interface MockMutationOptions<TData = unknown, TVariables = unknown> {
  mutate?: (variables: TVariables) => void
  mutateAsync?: (variables: TVariables) => Promise<TData>
  isPending?: boolean
  isError?: boolean
  isSuccess?: boolean
  error?: Error | null
  data?: TData
  reset?: ReturnType<typeof vi.fn>
}

// Default mock implementations
const defaultQueryResult: MockQueryOptions = {
  data: undefined,
  isLoading: false,
  isPending: false,
  isError: false,
  error: null,
  isFetching: false,
  isRefetching: false,
  isSuccess: true,
  refetch: vi.fn(),
  fetchStatus: 'idle',
}

const defaultMutationResult: MockMutationOptions = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: undefined,
  reset: vi.fn(),
}

// Mock QueryClient
const mockQueryClient = {
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  setQueryData: vi.fn(),
  getQueryData: vi.fn(),
  setQueriesData: vi.fn(),
  prefetchQuery: vi.fn().mockResolvedValue(undefined),
  cancelQueries: vi.fn().mockResolvedValue(undefined),
  removeQueries: vi.fn(),
  refetchQueries: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn(),
  getQueryCache: vi.fn(() => ({
    find: vi.fn(),
    findAll: vi.fn(() => []),
    clear: vi.fn(),
  })),
  getMutationCache: vi.fn(() => ({
    find: vi.fn(),
    findAll: vi.fn(() => []),
    clear: vi.fn(),
  })),
}

// Mutable state for controlling mock behavior in tests
let queryMockOverrides: Record<string, MockQueryOptions> = {}
let mutationMockOverrides: Record<string, MockMutationOptions> = {}

// Helper to set query mock for specific query key
export function mockQuery<TData = unknown>(
  queryKey: string | readonly unknown[],
  options: MockQueryOptions<TData>
): void {
  const key = Array.isArray(queryKey) ? JSON.stringify(queryKey) : queryKey
  queryMockOverrides[key] = options as MockQueryOptions
}

// Helper to set mutation mock for specific mutation key
export function mockMutation<TData = unknown, TVariables = unknown>(
  mutationKey: string,
  options: MockMutationOptions<TData, TVariables>
): void {
  mutationMockOverrides[mutationKey] = options as MockMutationOptions
}

// Helper to reset all mock overrides
export function resetQueryMocks(): void {
  queryMockOverrides = {}
  mutationMockOverrides = {}
  vi.clearAllMocks()
}

// Helper to get mock QueryClient
export function getMockQueryClient() {
  return mockQueryClient
}

// Mock implementation of useQuery
export const useQueryMock = vi.fn((options: { queryKey: readonly unknown[] }) => {
  const key = JSON.stringify(options.queryKey)
  const override = queryMockOverrides[key]
  return {
    ...defaultQueryResult,
    ...override,
  }
})

// Mock implementation of useMutation
export const useMutationMock = vi.fn(
  (options?: { mutationKey?: readonly unknown[]; onSuccess?: () => void; onError?: () => void }) => {
    const key = options?.mutationKey ? JSON.stringify(options.mutationKey) : 'default'
    const override = mutationMockOverrides[key]

    const mutate = vi.fn((variables: unknown) => {
      if (override?.mutate) {
        override.mutate(variables)
      }
      // Call onSuccess if provided and mutation is successful
      if (options?.onSuccess && !override?.isError) {
        options.onSuccess()
      }
    })

    const mutateAsync = vi.fn(async (variables: unknown) => {
      if (override?.mutateAsync) {
        return override.mutateAsync(variables)
      }
      if (options?.onSuccess && !override?.isError) {
        options.onSuccess()
      }
      return override?.data
    })

    return {
      ...defaultMutationResult,
      ...override,
      mutate,
      mutateAsync,
    }
  }
)

// Mock implementation of useQueryClient
export const useQueryClientMock = vi.fn(() => mockQueryClient)

// Apply mocks to @tanstack/react-query module
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: useQueryMock,
    useMutation: useMutationMock,
    useQueryClient: useQueryClientMock,
    useInfiniteQuery: vi.fn(() => ({
      data: undefined,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })),
    useSuspenseQuery: vi.fn(() => ({
      data: undefined,
      error: null,
    })),
  }
})

// Export mock utilities for use in tests
export { mockQueryClient }
