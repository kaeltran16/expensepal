'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

/**
 * Category suggestion response interface
 */
export interface CategorySuggestion {
  category: string
  confidence?: number
}

/**
 * Fetch category suggestion for a merchant
 */
async function fetchCategorySuggestion(merchant: string): Promise<CategorySuggestion> {
  const params = new URLSearchParams({ merchant })

  const response = await fetch(`/api/merchants/suggest-category?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch category suggestion')
  }

  return response.json()
}

/**
 * Hook to fetch AI-powered category suggestion for a merchant
 *
 * @param merchant - Merchant name to get suggestion for
 * @param options - React Query options
 *
 * @example
 * const { data: suggestion, isLoading } = useCategorySuggestion('Starbucks', {
 *   enabled: merchant.length > 2
 * })
 */
export function useCategorySuggestion(
  merchant: string,
  options?: {
    enabled?: boolean
    staleTime?: number
  }
) {
  return useQuery({
    queryKey: queryKeys.merchants.categorySuggestion(merchant),
    queryFn: () => fetchCategorySuggestion(merchant),
    enabled: merchant.length > 2 && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 60 * 60 * 1000, // Cache for 1 hour by default
  })
}
