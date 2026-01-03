/**
 * Test Setup Validation
 *
 * This test file validates that the test infrastructure is properly configured.
 * If these tests pass, the foundation is ready for writing actual tests.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

// Import mock utilities to verify they're accessible
import {
    jsonResponse,
    mockFetch,
    resetFetchMocks,
} from './mocks/fetch'
import {
    resetToastCalls,
    toast,
    toastCalls,
} from './mocks/sonner'
import {
    createMockBudget,
    createMockExpense,
    mockUser,
} from './mocks/supabase'
import {
    getMockQueryClient,
    mockQuery,
    resetQueryMocks,
} from './mocks/tanstack-query'
import {
    daysAgo,
    formatCurrencyMock,
    hapticFeedbackMock,
} from './mocks/utils'

describe('Test Infrastructure Validation', () => {
  describe('jest-dom matchers', () => {
    it('should have jest-dom matchers available', () => {
      const div = document.createElement('div')
      div.textContent = 'Hello'
      document.body.appendChild(div)

      expect(div).toBeInTheDocument()
      expect(div).toHaveTextContent('Hello')
      expect(div).toBeVisible()

      document.body.removeChild(div)
    })
  })

  describe('React Testing Library', () => {
    it('should render React components', () => {
      function TestComponent() {
        return React.createElement('div', { 'data-testid': 'test' }, 'Test Component')
      }

      render(React.createElement(TestComponent))

      expect(screen.getByTestId('test')).toBeInTheDocument()
      expect(screen.getByText('Test Component')).toBeInTheDocument()
    })

    it('should work with QueryClientProvider', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      function TestComponent() {
        return React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement('div', { 'data-testid': 'wrapped' }, 'Wrapped Component')
        )
      }

      render(React.createElement(TestComponent))

      expect(screen.getByTestId('wrapped')).toBeInTheDocument()
    })
  })

  describe('TanStack Query Mocks', () => {
    beforeEach(() => {
      resetQueryMocks()
    })

    it('should provide mockQuery helper', () => {
      mockQuery(['expenses', 'list'], {
        data: [createMockExpense()],
        isLoading: false,
      })

      // Mock is configured (actual usage would be in hook tests)
      expect(mockQuery).toBeDefined()
    })

    it('should provide mock QueryClient', () => {
      const client = getMockQueryClient()

      expect(client.invalidateQueries).toBeDefined()
      expect(client.setQueryData).toBeDefined()
      expect(client.getQueryData).toBeDefined()
    })
  })

  describe('Fetch Mocks', () => {
    beforeEach(() => {
      resetFetchMocks()
    })

    it('should mock fetch requests', async () => {
      mockFetch({
        url: '/api/test',
        response: jsonResponse({ success: true }),
      })

      const response = await fetch('/api/test')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual({ success: true })
    })

    it('should handle different HTTP methods', async () => {
      mockFetch({
        url: '/api/expenses',
        method: 'POST',
        response: jsonResponse({ id: '123' }, 201),
      })

      const response = await fetch('/api/expenses', { method: 'POST' })

      expect(response.status).toBe(201)
    })
  })

  describe('Supabase Mocks', () => {
    it('should provide mock user', () => {
      expect(mockUser.id).toBe('test-user-id')
      expect(mockUser.email).toBe('test@example.com')
    })

    it('should create mock expenses', () => {
      const expense = createMockExpense({ amount: 100000 })

      expect(expense.amount).toBe(100000)
      expect(expense.user_id).toBe(mockUser.id)
      expect(expense.id).toBeDefined()
    })

    it('should create mock budgets', () => {
      const budget = createMockBudget({ category: 'Transport' })

      expect(budget.category).toBe('Transport')
      expect(budget.user_id).toBe(mockUser.id)
    })
  })

  describe('Sonner Toast Mocks', () => {
    beforeEach(() => {
      resetToastCalls()
    })

    it('should track toast calls', () => {
      toast.success('Test message')

      expect(toastCalls).toHaveLength(1)
      expect(toastCalls[0].type).toBe('success')
      expect(toastCalls[0].message).toBe('Test message')
    })

    it('should track multiple toast types', () => {
      toast.success('Success')
      toast.error('Error')
      toast.warning('Warning')

      expect(toastCalls).toHaveLength(3)
    })
  })

  describe('Utility Mocks', () => {
    it('should mock hapticFeedback', () => {
      hapticFeedbackMock('medium')

      expect(hapticFeedbackMock).toHaveBeenCalledWith('medium')
    })

    it('should mock formatCurrency', () => {
      const result = formatCurrencyMock(50000)

      expect(formatCurrencyMock).toHaveBeenCalledWith(50000)
      expect(typeof result).toBe('string')
    })

    it('should provide date utilities', () => {
      const threeDaysAgo = daysAgo(3)

      expect(new Date(threeDaysAgo)).toBeInstanceOf(Date)
      expect(new Date(threeDaysAgo).getTime()).toBeLessThan(Date.now())
    })
  })

  describe('Browser API Mocks', () => {
    it('should mock matchMedia', () => {
      const mq = window.matchMedia('(min-width: 768px)')

      expect(mq.matches).toBe(false)
      expect(mq.addEventListener).toBeDefined()
    })

    it('should mock IntersectionObserver', () => {
      const callback = () => {}
      const observer = new IntersectionObserver(callback)

      expect(observer.observe).toBeDefined()
      expect(observer.disconnect).toBeDefined()
    })

    it('should mock ResizeObserver', () => {
      const callback = () => {}
      const observer = new ResizeObserver(callback)

      expect(observer.observe).toBeDefined()
      expect(observer.disconnect).toBeDefined()
    })

    it('should mock navigator.vibrate', () => {
      navigator.vibrate(100)

      expect(navigator.vibrate).toHaveBeenCalledWith(100)
    })

    it('should mock localStorage', () => {
      localStorage.setItem('test', 'value')

      expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value')
    })
  })
})
