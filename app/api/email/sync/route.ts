import { calorieEstimator } from '@/lib/calorie-estimator'
import { getEmailServices } from '@/lib/email-service'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to sync emails.' },
        { status: 401 }
      )
    }

    const emailServices = getEmailServices()

    // Check if any email accounts are configured
    if (emailServices.length === 0) {
      return NextResponse.json(
        { error: 'No email accounts configured' },
        { status: 400 }
      )
    }

    console.log(`Syncing from ${emailServices.length} email account(s)...`)
    console.log(`Associating expenses with user: ${user.id} (${user.email})`)

    // Fetch expenses from all configured email accounts
    const fetchPromises = emailServices.map((service, index) => {
      console.log(`Fetching from email account ${index + 1}...`)
      return service.fetchUnreadExpenses()
    })

    const allExpensesArrays = await Promise.all(fetchPromises)
    const expenses = allExpensesArrays.flat()

    if (expenses.length === 0) {
      return NextResponse.json({
        message: 'No new expenses found',
        newExpenses: 0,
        count: 0,
        duplicates: 0,
        failed: 0,
        mealsCreated: 0,
        accounts: emailServices.length,
        expenses: [],
      })
    }

    console.log(`Found ${expenses.length} total expenses from all accounts`)

    // Insert expenses into database
    const insertResults = []
    let successful = 0
    let failed = 0
    let duplicates = 0
    let mealsCreated = 0

    for (const expense of expenses) {
      console.log(`Attempting to insert: ${expense.amount} ${expense.currency} at ${expense.merchant}`)

      const { data, error } = await supabaseAdmin.from('expenses').insert([
        {
          user_id: user.id,
          transaction_type: expense.transactionType,
          amount: expense.amount,
          currency: expense.currency,
          transaction_date: expense.transactionDate,
          merchant: expense.merchant,
          source: expense.source,
          email_subject: expense.emailSubject,
          category: expense.category,
        },
      ]).select()

      if (error) {
        console.error(`Failed to insert expense:`, error)

        // Check if it's a duplicate (unique constraint violation)
        if (error.code === '23505') {
          console.log(`Duplicate expense detected (already exists in database)`)
          duplicates++
        } else {
          failed++
        }

        insertResults.push({ success: false, error: error.message, expense })
      } else {
        console.log(`✓ Successfully inserted expense with ID: ${data[0]?.id}`)
        successful++
        insertResults.push({ success: true, data, expense })

        // Auto-create meal entry for GrabFood orders
        if (expense.transactionType?.toLowerCase().includes('grabfood')) {
          console.log(`🍔 Detected GrabFood order, estimating calories...`)
          try {
            // Estimate calories for this meal
            const mealDescription = `${expense.merchant}`
            const estimate = await calorieEstimator.estimate(mealDescription, {
              additionalInfo: `GrabFood order from ${expense.merchant}`,
            })

            // Determine meal time based on transaction time in GMT+7
            const transactionDate = new Date(expense.transactionDate)
            const hour = transactionDate.getHours()
            let mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other' = 'other'

            if (hour >= 6 && hour < 11) {
              mealTime = 'breakfast'
            } else if (hour >= 11 && hour < 16) {
              mealTime = 'lunch'
            } else if (hour >= 16 && hour < 22) {
              mealTime = 'dinner'
            } else {
              mealTime = 'snack'
            }

            // Create meal entry linked to expense (IMPORTANT: Include user_id!)
            const { error: mealError } = await supabaseAdmin.from('meals').insert({
              user_id: user.id, // Fix: Add user_id to associate meal with user
              name: mealDescription,
              calories: estimate.calories,
              protein: estimate.protein,
              carbs: estimate.carbs,
              fat: estimate.fat,
              meal_time: mealTime,
              meal_date: expense.transactionDate,
              source: 'email',
              confidence: estimate.confidence,
              expense_id: data[0]?.id,
              llm_reasoning: estimate.reasoning,
              notes: `Auto-tracked from GrabFood order`,
            })

            if (mealError) {
              console.error(`Failed to create meal entry:`, mealError)
            } else {
              console.log(`✓ Created meal entry: ${estimate.calories} cal from ${expense.merchant}`)
              mealsCreated++
            }
          } catch (mealEstimateError) {
            console.error(`Error estimating calories for GrabFood:`, mealEstimateError)
            // Don't fail the whole sync if calorie estimation fails
          }
        }
      }
    }

    console.log(`\n=== SYNC SUMMARY ===`)
    console.log(`Total parsed: ${expenses.length}`)
    console.log(`Successfully inserted: ${successful}`)
    console.log(`Duplicates skipped: ${duplicates}`)
    console.log(`Failed: ${failed}`)
    console.log(`Meals auto-tracked: ${mealsCreated}`)

    return NextResponse.json({
      message: `Synced ${successful} new expenses (${duplicates} duplicates skipped, ${failed} failed)`,
      newExpenses: successful,
      count: successful, // Keep for backwards compatibility
      duplicates,
      failed,
      mealsCreated,
      accounts: emailServices.length,
      results: insertResults,
    })
  } catch (error) {
    console.error('Error syncing emails:', error)
    // Never expose internal error details that might contain credentials
    return NextResponse.json(
      { error: 'Failed to sync emails' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Return sync status and last sync time
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('created_at')
      .eq('source', 'email')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({
      configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
      lastSync: data?.[0]?.created_at || null,
    })
  } catch (error) {
    console.error('Error checking sync status:', error)
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    )
  }
}
