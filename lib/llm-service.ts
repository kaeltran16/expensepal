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
  private defaultModel = 'google/gemini-2.0-flash-001' // Fast and free model
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
          model: options.model || this.defaultModel,
          messages: options.messages,
          temperature: options.temperature ?? 0.1,
          max_tokens: options.maxTokens ?? 500,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LLM API error:', response.status, errorText)
        return null
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        console.error('No content in LLM response')
        return null
      }

      return {
        content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      }
    } catch (error) {
      console.error('LLM service error:', error)
      return null
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
}

// Singleton instance
export const llmService = new LLMService()
