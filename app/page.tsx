import { Suspense } from 'react'
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import { queryKeys } from '@/lib/hooks/query-keys'
import { SplashGate } from '@/components/splash-gate'
import { HomeContent } from '@/components/home-content'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const queryClient = new QueryClient()
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const currentMonth = new Date().toISOString().slice(0, 7)

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.expenses.list(),
        queryFn: async () => {
          const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .limit(100)
          return data || []
        },
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.budgets.list({ month: currentMonth }),
        queryFn: async () => {
          const { data } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .eq('month', currentMonth)
          return data || []
        },
      }),
      queryClient.prefetchQuery({
        queryKey: ['profile'],
        queryFn: async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
          return data
        },
      }),
    ])
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SplashGate>
        <Suspense fallback={null}>
          <HomeContent />
        </Suspense>
      </SplashGate>
    </HydrationBoundary>
  )
}
