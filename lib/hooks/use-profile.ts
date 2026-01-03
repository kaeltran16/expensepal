import { createClient } from '@/lib/supabase/client'
import type { UserProfile, UserProfileUpdate } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Fetch user profile
async function fetchProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch('/api/profile', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }

  const data = await response.json()
  return data.profile
}

// Update user profile
async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error('Failed to update profile')
  }

  const data = await response.json()
  return data.profile
}

// Hook to fetch profile
export function useProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled,
  })
}

// Hook to update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['profile'] })

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(['profile'])

      // Optimistically update
      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(['profile'], {
          ...previousProfile,
          ...updates,
        })
      }

      return { previousProfile }
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile'], context.previousProfile)
      }
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData(['profile'], data)
    },
  })
}
