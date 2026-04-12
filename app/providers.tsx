'use client'

import { QueryProvider } from '@/components/query-provider'
import { AuthProvider } from '@/components/auth-provider'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              marginTop: 'env(safe-area-inset-top)',
            },
          }}
        />
      </AuthProvider>
    </QueryProvider>
  )
}
