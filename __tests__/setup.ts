import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'

// Mock environment variables
process.env.OPENROUTER_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Global test setup
beforeEach(() => {
  vi.clearAllMocks()
})
