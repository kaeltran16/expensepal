import { supabaseAdmin } from './supabase'

/**
 * Reusable LLM Service for OpenRouter API
 * Supports multiple models and configurable parameters
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  messages: LLMMessage[]
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class LLMService {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions'
  private defaultModel = 'google/gemini-2.5-flash' 
  private appUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || ''
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  /**
   * Check if LLM service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Send a completion request to OpenRouter
   */
  async completion(options: LLMOptions): Promise<LLMResponse | null> {
    if (!this.isConfigured()) {
      console.warn('LLM service not configured (missing OPENROUTER_API_KEY)')
      return null
    }

    const startTime = Date.now()
    const model = options.model || this.defaultModel
    const prompt = JSON.stringify(options.messages)
    let responseContent: string | null = null
    let usage: LLMResponse['usage'] | undefined
    let status = 'error'

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.appUrl,
          'X-Title': 'Expense Tracker',
        },
        body: JSON.stringify({
          model: model,
          messages: options.messages,
          temperature: options.temperature ?? 0.1,
          max_tokens: options.maxTokens ?? 500,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LLM API error:', response.status, errorText)
        responseContent = `Error ${response.status}: ${errorText}`
        return null
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        console.error('No content in LLM response')
        responseContent = 'No content in response'
        return null
      }

      responseContent = content
      usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined
      
      status = 'success'

      return {
        content,
        usage,
      }
    } catch (error) {
      console.error('LLM service error:', error)
      responseContent = error instanceof Error ? error.message : String(error)
      return null
    } finally {
      // Log to database (fire and forget)
      const durationMs = Date.now() - startTime
      this.logToDatabase({
        model,
        prompt,
        response: responseContent,
        tokens_prompt: usage?.promptTokens,
        tokens_completion: usage?.completionTokens,
        tokens_total: usage?.totalTokens,
        duration_ms: durationMs,
        status,
      }).catch(err => console.error('Failed to log LLM call:', err))
    }
  }

  /**
   * Log LLM call to Supabase
   */
  private async logToDatabase(log: {
    model: string
    prompt: string
    response: string | null
    tokens_prompt?: number
    tokens_completion?: number
    tokens_total?: number
    duration_ms: number
    status: string
  }) {
    try {
      await supabaseAdmin.from('llm_logs').insert({
        model: log.model,
        prompt: log.prompt,
        response: log.response,
        tokens_prompt: log.tokens_prompt,
        tokens_completion: log.tokens_completion,
        tokens_total: log.tokens_total,
        duration_ms: log.duration_ms,
        status: log.status,
      })
    } catch (error) {
      console.error('Error writing to llm_logs:', error)
    }
  }

  /**
   * Parse JSON response from LLM (handles markdown code blocks)
   */
  parseJSON<T = any>(content: string): T | null {
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [
        null,
        content,
      ]
      const jsonStr = jsonMatch[1] || content
      return JSON.parse(jsonStr.trim())
    } catch (e) {
      console.error('Failed to parse LLM response as JSON:', content)
      return null
    }
  }

  /**
   * Simple text prompt helper
   */
  async ask(
    prompt: string,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      systemPrompt?: string
    }
  ): Promise<string | null> {
    const messages: LLMMessage[] = []

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }

    messages.push({ role: 'user', content: prompt })

    const response = await this.completion({
      messages,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    })

    return response?.content || null
  }

  /**
   * Batch completion - make a single LLM call for multiple items
   * More efficient than multiple sequential calls
   */
  async batchCompletion<T = any>(
    items: string[],
    promptBuilder: (items: string[]) => string,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      systemPrompt?: string
    }
  ): Promise<T[] | null> {
    if (!this.isConfigured()) {
      console.warn('LLM service not configured (missing OPENROUTER_API_KEY)')
      return null
    }

    if (items.length === 0) {
      return []
    }

    const messages: LLMMessage[] = []

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }

    messages.push({ role: 'user', content: promptBuilder(items) })

    const response = await this.completion({
      messages,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens || 2000, // Higher default for batch requests
    })

    if (!response?.content) {
      return null
    }

    return this.parseJSON<T[]>(response.content)
  }
}

// Singleton instance
export const llmService = new LLMService()
