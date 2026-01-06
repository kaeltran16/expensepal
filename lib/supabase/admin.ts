import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Admin Supabase client that bypasses Row Level Security (RLS)
 *
 * ⚠️ SECURITY WARNING:
 * - This client has FULL database access and bypasses all RLS policies
 * - ONLY use this in server-side code (API routes, server components)
 * - NEVER import this in client components or expose to the browser
 * - Use `lib/supabase/server.ts` for authenticated requests that respect RLS
 *
 * Valid use cases:
 * - Admin operations that need to bypass RLS
 * - Bulk operations across multiple users
 * - System-level operations (logging, analytics)
 * - Operations on tables without RLS policies
 */

// Only initialize on server-side (typeof window === 'undefined')
// This prevents the admin client from being created in the browser
export const supabaseAdmin =
  typeof window === 'undefined'
    ? (() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl) {
          throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
        }

        if (!supabaseServiceRoleKey) {
          throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
        }

        return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      })()
    : (null as any) // Return null in browser (should never be used client-side)
