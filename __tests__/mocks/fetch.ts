/**
 * Fetch API Mocks
 *
 * Provides mock implementations for the global fetch API.
 * Allows tests to configure responses for different endpoints.
 */

import { vi } from 'vitest'

// Types for mock configuration
export interface MockFetchResponse {
  ok?: boolean
  status?: number
  statusText?: string
  json?: () => Promise<unknown>
  text?: () => Promise<string>
  headers?: Headers
}

export interface MockFetchConfig {
  url: string | RegExp
  method?: string
  response: MockFetchResponse | (() => MockFetchResponse)
}

// Store for mock configurations
let fetchMockConfigs: MockFetchConfig[] = []

// Default successful response
const defaultResponse: MockFetchResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({}),
  text: async () => '',
  headers: new Headers(),
}

// Default error response
const errorResponse: MockFetchResponse = {
  ok: false,
  status: 500,
  statusText: 'Internal Server Error',
  json: async () => ({ error: 'Internal Server Error' }),
  text: async () => 'Internal Server Error',
  headers: new Headers(),
}

/**
 * Add a mock fetch configuration
 */
export function mockFetch(config: MockFetchConfig): void {
  fetchMockConfigs.push(config)
}

/**
 * Add multiple mock fetch configurations
 */
export function mockFetchMany(configs: MockFetchConfig[]): void {
  fetchMockConfigs.push(...configs)
}

/**
 * Reset all fetch mock configurations
 */
export function resetFetchMocks(): void {
  fetchMockConfigs = []
}

/**
 * Create a successful JSON response
 */
export function jsonResponse<T>(data: T, status = 200): MockFetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  }
}

/**
 * Create an error response
 */
export function errorJsonResponse(
  message: string,
  status = 500
): MockFetchResponse {
  return {
    ok: false,
    status,
    statusText: message,
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  }
}

/**
 * Match URL against a string or RegExp pattern
 */
function matchUrl(url: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return url.includes(pattern)
  }
  return pattern.test(url)
}

/**
 * Mock implementation of fetch
 */
const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method?.toUpperCase() || 'GET'

    // Find matching mock configuration
    const config = fetchMockConfigs.find((c) => {
      const urlMatches = matchUrl(url, c.url)
      const methodMatches = !c.method || c.method.toUpperCase() === method
      return urlMatches && methodMatches
    })

    let mockResponse: MockFetchResponse

    if (config) {
      mockResponse =
        typeof config.response === 'function'
          ? config.response()
          : config.response
    } else {
      // Default to successful empty response if no mock configured
      mockResponse = defaultResponse
    }

    // Create a mock Response object
    return {
      ok: mockResponse.ok ?? true,
      status: mockResponse.status ?? 200,
      statusText: mockResponse.statusText ?? 'OK',
      json: mockResponse.json ?? (async () => ({})),
      text: mockResponse.text ?? (async () => ''),
      headers: mockResponse.headers ?? new Headers(),
      redirected: false,
      type: 'basic',
      url,
      clone: function () {
        return this
      },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
    } as Response
  }
)

// Apply mock to global fetch
vi.stubGlobal('fetch', fetchMock)

// Export utilities
export { defaultResponse, errorResponse, fetchMock }

