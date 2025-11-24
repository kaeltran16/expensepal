import type { ParsedExpense } from '@/lib/email-parser'
import { vi } from 'vitest'

export const createMockExpense = (overrides?: Partial<ParsedExpense>): ParsedExpense => ({
  transactionType: 'GrabFood',
  amount: 120000,
  currency: 'VND',
  transactionDate: '2025-11-24T12:00:00+07:00',
  merchant: 'Pizza Hut',
  category: 'Food',
  source: 'email',
  emailSubject: 'Your GrabFood receipt',
  ...overrides,
})

export const mockEmailService = {
  fetchUnreadExpenses: vi.fn().mockResolvedValue([]),
}

export const mockGetEmailServices = vi.fn(() => [mockEmailService])

// Mock the email service module
vi.mock('@/lib/email-service', () => ({
  getEmailServices: mockGetEmailServices,
}))
