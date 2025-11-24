import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'

// Mock environment variables
process.env.OPENROUTER_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Global test setup
beforeEach(() => {
  vi.clearAllMocks()
})
