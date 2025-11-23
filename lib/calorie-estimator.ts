import { supabaseAdmin } from './supabase'
import type { SavedFood } from './supabase'

export interface CalorieEstimate {
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  source: 'saved' | 'llm' | 'usda'
}

export interface EstimationContext {
  portionSize?: string         // e.g., "large", "medium", "small"
  mealTime?: string            // e.g., "breakfast", "lunch"
  additionalInfo?: string      // Any extra context from email or user
}

/**
 * Calorie Estimation Service
 * Uses a hybrid approach:
 * 1. Check personal saved_foods database first (instant, accurate)
 * 2. Fall back to LLM estimation (Claude API)
 * 3. Auto-save LLM estimates to database for future use
 */
export class CalorieEstimator {
  /**
   * Main estimation function
   * Returns calorie estimate with confidence level
   */
  async estimate(
    foodDescription: string,
    context?: EstimationContext
  ): Promise<CalorieEstimate> {
    // Step 1: Check personal database first
    const saved = await this.checkSavedFoods(foodDescription)
    if (saved) {
      return {
        calories: saved.calories,
        protein: saved.protein,
        carbs: saved.carbs,
        fat: saved.fat,
        confidence: 'high',
        reasoning: `Using saved food entry: "${saved.name}"`,
        source: 'saved',
      }
    }

    // Step 2: Use LLM to estimate
    console.log(`No saved food found for "${foodDescription}", using LLM estimation...`)
    const llmEstimate = await this.estimateWithLLM(foodDescription, context)

    // Step 3: Auto-save to database for future use
    await this.saveToDatabase(foodDescription, llmEstimate, context)

    return llmEstimate
  }

  /**
   * Check if food exists in personal saved_foods database
   * Uses fuzzy matching for flexibility
   */
  private async checkSavedFoods(
    foodDescription: string
  ): Promise<SavedFood | null> {
    try {
      // Exact match first
      const { data: exactMatch } = await supabaseAdmin
        .from('saved_foods')
        .select('*')
        .ilike('name', foodDescription)
        .single()

      if (exactMatch) {
        console.log(`✓ Found exact match in saved_foods: "${exactMatch.name}"`)
        // Update usage stats
        await this.updateUsageStats(exactMatch.id)
        return exactMatch
      }

      // Fuzzy match: search for partial matches
      const { data: partialMatches } = await supabaseAdmin
        .from('saved_foods')
        .select('*')
        .ilike('name', `%${foodDescription}%`)
        .limit(1)

      if (partialMatches && partialMatches.length > 0) {
        console.log(`✓ Found partial match in saved_foods: "${partialMatches[0].name}"`)
        await this.updateUsageStats(partialMatches[0].id)
        return partialMatches[0]
      }

      return null
    } catch (error) {
      console.error('Error checking saved_foods:', error)
      return null
    }
  }

  /**
   * Update usage statistics for a saved food
   */
  private async updateUsageStats(foodId: string): Promise<void> {
    try {
      // Fetch current count
      const { data: food } = await supabaseAdmin
        .from('saved_foods')
        .select('use_count')
        .eq('id', foodId)
        .single()

      if (food) {
        // Increment and update
        await supabaseAdmin
          .from('saved_foods')
          .update({
            use_count: food.use_count + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', foodId)
      }
    } catch (error) {
      console.error('Error updating usage stats:', error)
    }
  }

  /**
   * Estimate calories using OpenRouter AI (Gemini - fast and free)
   */
  private async estimateWithLLM(
    foodDescription: string,
    context?: EstimationContext
  ): Promise<CalorieEstimate> {
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      console.warn('OPENROUTER_API_KEY not configured, using fallback estimation')
      return this.fallbackEstimate(foodDescription)
    }

    try {
      const prompt = this.buildPrompt(foodDescription, context)

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Expense Tracker Calorie Estimator',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash', // Fast and free model
          max_tokens: 500,
          temperature: 0.1, // Low temperature for consistent estimates
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenRouter API error:', response.status, errorText)
        return this.fallbackEstimate(foodDescription)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        console.error('No content in OpenRouter response')
        return this.fallbackEstimate(foodDescription)
      }

      // Parse JSON response
      const parsed = this.parseResponse(content)
      console.log(`✓ LLM estimated "${foodDescription}":`, parsed)

      return parsed
    } catch (error) {
      console.error('Error in LLM estimation:', error)
      return this.fallbackEstimate(foodDescription)
    }
  }

  /**
   * Build the prompt for OpenRouter AI
   * Optimized for Vietnamese food and personal portions
   */
  private buildPrompt(
    foodDescription: string,
    context?: EstimationContext
  ): string {
    let contextInfo = ''
    if (context?.portionSize) {
      contextInfo += `\nPortion size: ${context.portionSize}`
    }
    if (context?.mealTime) {
      contextInfo += `\nMeal time: ${context.mealTime}`
    }
    if (context?.additionalInfo) {
      contextInfo += `\nAdditional context: ${context.additionalInfo}`
    }

    return `Estimate the nutritional information for this food item:

Food: "${foodDescription}"${contextInfo}

Context for estimation:
- This is for a Vietnamese user tracking personal calorie intake
- Use typical Vietnamese portion sizes unless specified otherwise
- If the food name includes a merchant/restaurant, consider their typical portions
- For GrabFood orders, assume restaurant-sized portions
- Be conservative but realistic with estimates

Provide your response in this EXACT JSON format (no markdown, no code blocks):
{
  "calories": <integer>,
  "protein": <number with 1 decimal>,
  "carbs": <number with 1 decimal>,
  "fat": <number with 1 decimal>,
  "confidence": "<high|medium|low>",
  "reasoning": "<brief explanation of your estimate>"
}

Confidence levels:
- "high": Common food with well-known nutrition (rice, chicken, eggs, etc.)
- "medium": Restaurant food or prepared dishes (phở, bánh mì, etc.)
- "low": Ambiguous description or highly variable food (salad, stir-fry, etc.)

Your estimate:`
  }

  /**
   * Parse Claude's response
   */
  private parseResponse(content: string): CalorieEstimate {
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [
        null,
        content,
      ]
      const jsonStr = jsonMatch[1] || content
      const parsed = JSON.parse(jsonStr.trim())

      // Validate required fields
      if (
        typeof parsed.calories !== 'number' ||
        typeof parsed.protein !== 'number' ||
        typeof parsed.carbs !== 'number' ||
        typeof parsed.fat !== 'number'
      ) {
        throw new Error('Invalid response format')
      }

      return {
        calories: Math.round(parsed.calories),
        protein: parseFloat(parsed.protein.toFixed(1)),
        carbs: parseFloat(parsed.carbs.toFixed(1)),
        fat: parseFloat(parsed.fat.toFixed(1)),
        confidence: parsed.confidence || 'medium',
        reasoning: parsed.reasoning || 'LLM estimate',
        source: 'llm',
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', content)
      throw error
    }
  }

  /**
   * Fallback estimation when LLM is unavailable
   * Uses very conservative defaults
   */
  private fallbackEstimate(foodDescription: string): CalorieEstimate {
    console.warn(`Using fallback estimate for "${foodDescription}"`)

    // Very basic heuristic based on food type
    const lower = foodDescription.toLowerCase()
    let calories = 400 // Default

    if (lower.includes('phở') || lower.includes('pho')) {
      calories = 450
    } else if (lower.includes('bánh mì') || lower.includes('banh mi')) {
      calories = 400
    } else if (lower.includes('cơm') || lower.includes('rice')) {
      calories = 550
    } else if (lower.includes('bún') || lower.includes('noodle')) {
      calories = 400
    } else if (lower.includes('coffee') || lower.includes('cà phê')) {
      calories = 150
    }

    // Rough macros (40% carbs, 30% protein, 30% fat)
    const protein = Math.round((calories * 0.3) / 4)
    const carbs = Math.round((calories * 0.4) / 4)
    const fat = Math.round((calories * 0.3) / 9)

    return {
      calories,
      protein,
      carbs,
      fat,
      confidence: 'low',
      reasoning:
        'Fallback estimate (LLM unavailable). Please verify and update.',
      source: 'llm',
    }
  }

  /**
   * Save LLM estimate to database for future use
   */
  private async saveToDatabase(
    foodDescription: string,
    estimate: CalorieEstimate,
    context?: EstimationContext
  ): Promise<void> {
    try {
      // Don't save fallback estimates (low quality)
      if (estimate.confidence === 'low' && estimate.source === 'llm') {
        console.log('Skipping database save for low-confidence fallback estimate')
        return
      }

      const { error } = await supabaseAdmin.from('saved_foods').insert({
        name: foodDescription,
        calories: estimate.calories,
        protein: estimate.protein,
        carbs: estimate.carbs,
        fat: estimate.fat,
        source: estimate.source,
        use_count: 1,
        last_used_at: new Date().toISOString(),
        portion_description: context?.portionSize,
        notes: estimate.reasoning,
      })

      if (error) {
        // Might already exist, that's okay
        if (error.code === '23505') {
          // Unique constraint violation
          console.log(`Food "${foodDescription}" already exists in database`)
        } else {
          console.error('Error saving to database:', error)
        }
      } else {
        console.log(`✓ Saved "${foodDescription}" to database for future use`)
      }
    } catch (error) {
      console.error('Error in saveToDatabase:', error)
    }
  }

  /**
   * Batch estimation for multiple foods (e.g., from Grab order with item list)
   */
  async estimateBatch(
    foodDescriptions: string[],
    context?: EstimationContext
  ): Promise<CalorieEstimate[]> {
    const estimates = await Promise.all(
      foodDescriptions.map((food) => this.estimate(food, context))
    )
    return estimates
  }

  /**
   * Get total calories from multiple items
   */
  async estimateTotal(
    foodDescriptions: string[],
    context?: EstimationContext
  ): Promise<CalorieEstimate> {
    const estimates = await this.estimateBatch(foodDescriptions, context)

    const total = estimates.reduce(
      (acc, est) => ({
        calories: acc.calories + est.calories,
        protein: acc.protein + est.protein,
        carbs: acc.carbs + est.carbs,
        fat: acc.fat + est.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    // Confidence is lowest of all items
    const lowestConfidence = estimates.some((e) => e.confidence === 'low')
      ? 'low'
      : estimates.some((e) => e.confidence === 'medium')
        ? 'medium'
        : 'high'

    return {
      ...total,
      confidence: lowestConfidence,
      reasoning: `Total from ${estimates.length} items: ${foodDescriptions.join(', ')}`,
      source: 'llm',
    }
  }
}

// Singleton instance
export const calorieEstimator = new CalorieEstimator()
