import type { Database } from '@/lib/supabase/database.types'
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js'

/**
 * Query Builder for Supabase queries
 * Provides a fluent API for building type-safe database queries
 * with filtering, pagination, and sorting capabilities
 */

// ============================================================================
// Type Helpers
// ============================================================================

type SupabaseQueryBuilder<T extends keyof Database['public']['Tables']> = ReturnType<
  ReturnType<ReturnType<SupabaseClient<Database>['from']>['select']>['eq']
>

// ============================================================================
// Base Query Builder
// ============================================================================

/**
 * Generic base query builder class
 * Provides common functionality for all entity-specific builders
 */
export abstract class BaseQueryBuilder<T extends keyof Database['public']['Tables']> {
  protected query: SupabaseQueryBuilder<T>

  constructor(
    protected supabase: SupabaseClient<Database>,
    protected table: T,
    protected userId: string
  ) {
    // Initialize base query with user filter and default ordering
    // Using type assertion because Supabase's generated types are complex
    this.query = (this.supabase
      .from(this.table as T & string)
      .select('*')
      .eq('user_id' as never, this.userId)) as unknown as SupabaseQueryBuilder<T>
  }

  /**
   * Add pagination to the query
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   */
  paginate(page: number, limit: number) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    this.query = this.query.range(from, to) as SupabaseQueryBuilder<T>
    return this
  }

  /**
   * Add limit to the query
   * @param limit - Maximum number of items to return
   */
  limit(limit: number) {
    this.query = this.query.limit(limit) as SupabaseQueryBuilder<T>
    return this
  }

  /**
   * Add offset to the query
   * @param offset - Number of items to skip
   */
  offset(offset: number) {
    this.query = this.query.range(offset, offset + 999999) as SupabaseQueryBuilder<T>
    return this
  }

  /**
   * Execute the query and return results
   */
  async execute(): Promise<{
    data: Database['public']['Tables'][T]['Row'][] | null
    error: PostgrestError | null
  }> {
    // Type assertion is safe here because we know the runtime behavior
    return (await this.query) as {
      data: Database['public']['Tables'][T]['Row'][] | null
      error: PostgrestError | null
    }
  }

  /**
   * Execute the query and return a single result
   */
  async single(): Promise<{
    data: Database['public']['Tables'][T]['Row'] | null
    error: PostgrestError | null
  }> {
    // Type assertion is safe here because we know the runtime behavior
    return (await this.query.single()) as {
      data: Database['public']['Tables'][T]['Row'] | null
      error: PostgrestError | null
    }
  }

  /**
   * Execute the query and return count
   */
  async count(): Promise<{
    count: number | null
    error: PostgrestError | null
  }> {
    const countQuery = this.supabase
      .from(this.table as T & string)
      .select('*', { count: 'exact', head: true })
      .eq('user_id' as never, this.userId)

    // Type assertion is safe here because we know the runtime behavior
    return (await countQuery) as {
      count: number | null
      error: PostgrestError | null
    }
  }
}

// ============================================================================
// Expense Query Builder
// ============================================================================

export interface ExpenseFilters {
  startDate?: string
  endDate?: string
  category?: string
  merchant?: string
  minAmount?: number
  maxAmount?: number
  source?: 'manual' | 'email'
  currency?: string
}

export class ExpenseQueryBuilder extends BaseQueryBuilder<'expenses'> {
  constructor(supabase: SupabaseClient<Database>, userId: string) {
    super(supabase, 'expenses', userId)
    // Default: order by transaction_date descending
    this.query = this.query.order('transaction_date', { ascending: false })
  }

  /**
   * Apply multiple filters at once
   */
  withFilters(filters: ExpenseFilters) {
    if (filters.startDate) {
      this.query = this.query.gte('transaction_date', filters.startDate)
    }

    if (filters.endDate) {
      this.query = this.query.lte('transaction_date', filters.endDate)
    }

    if (filters.category) {
      this.query = this.query.eq('category', filters.category)
    }

    if (filters.merchant) {
      this.query = this.query.ilike('merchant', `%${filters.merchant}%`)
    }

    if (filters.minAmount !== undefined) {
      this.query = this.query.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount !== undefined) {
      this.query = this.query.lte('amount', filters.maxAmount)
    }

    if (filters.source) {
      this.query = this.query.eq('source', filters.source)
    }

    if (filters.currency) {
      this.query = this.query.eq('currency', filters.currency)
    }

    return this
  }

  /**
   * Filter by date range
   */
  byDateRange(startDate: string, endDate: string) {
    this.query = this.query
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
    return this
  }

  /**
   * Filter by category
   */
  byCategory(category: string) {
    this.query = this.query.eq('category', category)
    return this
  }

  /**
   * Filter by merchant (case-insensitive partial match)
   */
  byMerchant(merchant: string) {
    this.query = this.query.ilike('merchant', `%${merchant}%`)
    return this
  }

  /**
   * Filter by amount range
   */
  byAmountRange(minAmount: number, maxAmount: number) {
    this.query = this.query.gte('amount', minAmount).lte('amount', maxAmount)
    return this
  }

  /**
   * Filter by source (manual or email)
   */
  bySource(source: 'manual' | 'email') {
    this.query = this.query.eq('source', source)
    return this
  }

  /**
   * Order by transaction date
   */
  orderByDate(ascending: boolean = false) {
    this.query = this.query.order('transaction_date', { ascending })
    return this
  }

  /**
   * Order by amount
   */
  orderByAmount(ascending: boolean = false) {
    this.query = this.query.order('amount', { ascending })
    return this
  }

  /**
   * Order by merchant name
   */
  orderByMerchant(ascending: boolean = true) {
    this.query = this.query.order('merchant', { ascending })
    return this
  }
}

// ============================================================================
// Budget Query Builder
// ============================================================================

export interface BudgetFilters {
  category?: string
  month?: string
  minAmount?: number
  maxAmount?: number
}

export class BudgetQueryBuilder extends BaseQueryBuilder<'budgets'> {
  constructor(supabase: SupabaseClient<Database>, userId: string) {
    super(supabase, 'budgets', userId)
    // Default: order by month descending
    this.query = this.query.order('month', { ascending: false })
  }

  /**
   * Apply multiple filters at once
   */
  withFilters(filters: BudgetFilters) {
    if (filters.category) {
      this.query = this.query.eq('category', filters.category)
    }

    if (filters.month) {
      this.query = this.query.eq('month', filters.month)
    }

    if (filters.minAmount !== undefined) {
      this.query = this.query.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount !== undefined) {
      this.query = this.query.lte('amount', filters.maxAmount)
    }

    return this
  }

  /**
   * Filter by specific month (YYYY-MM format)
   */
  byMonth(month: string) {
    this.query = this.query.eq('month', month)
    return this
  }

  /**
   * Filter by category
   */
  byCategory(category: string) {
    this.query = this.query.eq('category', category)
    return this
  }

  /**
   * Order by month
   */
  orderByMonth(ascending: boolean = false) {
    this.query = this.query.order('month', { ascending })
    return this
  }

  /**
   * Order by amount
   */
  orderByAmount(ascending: boolean = false) {
    this.query = this.query.order('amount', { ascending })
    return this
  }
}

// ============================================================================
// Goal Query Builder
// ============================================================================

export interface GoalFilters {
  category?: string
  minTarget?: number
  maxTarget?: number
  completed?: boolean
}

export class GoalQueryBuilder extends BaseQueryBuilder<'savings_goals'> {
  constructor(supabase: SupabaseClient<Database>, userId: string) {
    super(supabase, 'savings_goals', userId)
    // Default: order by deadline ascending
    this.query = this.query.order('deadline', { ascending: true })
  }

  /**
   * Apply multiple filters at once
   */
  withFilters(filters: GoalFilters) {
    if (filters.category) {
      this.query = this.query.eq('category', filters.category)
    }

    if (filters.minTarget !== undefined) {
      this.query = this.query.gte('target_amount', filters.minTarget)
    }

    if (filters.maxTarget !== undefined) {
      this.query = this.query.lte('target_amount', filters.maxTarget)
    }

    if (filters.completed !== undefined) {
      // Filter goals where current_amount >= target_amount
      if (filters.completed) {
        // This would need a raw SQL query or computed column
        // For now, we'll fetch all and filter in application code
      }
    }

    return this
  }

  /**
   * Filter by category
   */
  byCategory(category: string) {
    this.query = this.query.eq('category', category)
    return this
  }

  /**
   * Filter goals with upcoming deadlines (within N days)
   */
  upcomingDeadline(daysAhead: number) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    this.query = this.query
      .gte('deadline', new Date().toISOString())
      .lte('deadline', futureDate.toISOString())

    return this
  }

  /**
   * Order by deadline
   */
  orderByDeadline(ascending: boolean = true) {
    this.query = this.query.order('deadline', { ascending })
    return this
  }

  /**
   * Order by target amount
   */
  orderByTarget(ascending: boolean = false) {
    this.query = this.query.order('target_amount', { ascending })
    return this
  }

  /**
   * Order by progress percentage (requires calculation in app)
   */
  orderByProgress(ascending: boolean = false) {
    // This would require computed column or post-query sorting
    // For now, just order by current_amount
    this.query = this.query.order('current_amount', { ascending })
    return this
  }
}

// ============================================================================
// Meal Query Builder
// ============================================================================

export interface MealFilters {
  startDate?: string
  endDate?: string
  mealTime?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  minCalories?: number
  maxCalories?: number
}

export class MealQueryBuilder extends BaseQueryBuilder<'meals'> {
  constructor(supabase: SupabaseClient<Database>, userId: string) {
    super(supabase, 'meals', userId)
    // Default: order by meal_date descending
    this.query = this.query.order('meal_date', { ascending: false })
  }

  /**
   * Apply multiple filters at once
   */
  withFilters(filters: MealFilters) {
    if (filters.startDate) {
      this.query = this.query.gte('meal_date', filters.startDate)
    }

    if (filters.endDate) {
      this.query = this.query.lte('meal_date', filters.endDate)
    }

    if (filters.mealTime) {
      this.query = this.query.eq('meal_time', filters.mealTime)
    }

    if (filters.minCalories !== undefined) {
      this.query = this.query.gte('calories', filters.minCalories)
    }

    if (filters.maxCalories !== undefined) {
      this.query = this.query.lte('calories', filters.maxCalories)
    }

    return this
  }

  /**
   * Filter by date range
   */
  byDateRange(startDate: string, endDate: string) {
    this.query = this.query.gte('meal_date', startDate).lte('meal_date', endDate)
    return this
  }

  /**
   * Filter by meal time
   */
  byMealTime(mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snack') {
    this.query = this.query.eq('meal_time', mealTime)
    return this
  }

  /**
   * Filter by specific date
   */
  byDate(date: string) {
    this.query = this.query.eq('meal_date', date)
    return this
  }

  /**
   * Order by date
   */
  orderByDate(ascending: boolean = false) {
    this.query = this.query.order('meal_date', { ascending })
    return this
  }

  /**
   * Order by calories
   */
  orderByCalories(ascending: boolean = false) {
    this.query = this.query.order('calories', { ascending })
    return this
  }
}

// ============================================================================
// Workout Query Builder
// ============================================================================

export interface WorkoutFilters {
  startDate?: string
  endDate?: string
  templateId?: string
  minDuration?: number
  maxDuration?: number
}

export class WorkoutQueryBuilder extends BaseQueryBuilder<'workouts'> {
  constructor(supabase: SupabaseClient<Database>, userId: string) {
    super(supabase, 'workouts', userId)
    // Default: order by date descending
    this.query = this.query.order('date', { ascending: false })
  }

  /**
   * Apply multiple filters at once
   */
  withFilters(filters: WorkoutFilters) {
    if (filters.startDate) {
      this.query = this.query.gte('date', filters.startDate)
    }

    if (filters.endDate) {
      this.query = this.query.lte('date', filters.endDate)
    }

    if (filters.templateId) {
      this.query = this.query.eq('template_id', filters.templateId)
    }

    if (filters.minDuration !== undefined) {
      this.query = this.query.gte('duration_minutes', filters.minDuration)
    }

    if (filters.maxDuration !== undefined) {
      this.query = this.query.lte('duration_minutes', filters.maxDuration)
    }

    return this
  }

  /**
   * Filter by date range
   */
  byDateRange(startDate: string, endDate: string) {
    this.query = this.query.gte('date', startDate).lte('date', endDate)
    return this
  }

  /**
   * Filter by template
   */
  byTemplate(templateId: string) {
    this.query = this.query.eq('template_id', templateId)
    return this
  }

  /**
   * Filter by specific date
   */
  byDate(date: string) {
    this.query = this.query.eq('date', date)
    return this
  }

  /**
   * Order by date
   */
  orderByDate(ascending: boolean = false) {
    this.query = this.query.order('date', { ascending })
    return this
  }

  /**
   * Order by duration
   */
  orderByDuration(ascending: boolean = false) {
    this.query = this.query.order('duration_minutes', { ascending })
    return this
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an expense query builder
 */
export function createExpenseQuery(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return new ExpenseQueryBuilder(supabase, userId)
}

/**
 * Create a budget query builder
 */
export function createBudgetQuery(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return new BudgetQueryBuilder(supabase, userId)
}

/**
 * Create a goal query builder
 */
export function createGoalQuery(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return new GoalQueryBuilder(supabase, userId)
}

/**
 * Create a meal query builder
 */
export function createMealQuery(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return new MealQueryBuilder(supabase, userId)
}

/**
 * Create a workout query builder
 */
export function createWorkoutQuery(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return new WorkoutQueryBuilder(supabase, userId)
}
