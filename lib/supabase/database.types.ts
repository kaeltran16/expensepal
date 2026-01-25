export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      budget_recommendations_cache: {
        Row: {
          ai_powered_count: number | null
          algorithmic_count: number | null
          created_at: string
          data_points: number
          expires_at: string
          generated_at: string
          id: string
          months_analyzed: number
          recommendations: Json
          total_savings_opportunity: number | null
          user_id: string
        }
        Insert: {
          ai_powered_count?: number | null
          algorithmic_count?: number | null
          created_at?: string
          data_points: number
          expires_at?: string
          generated_at?: string
          id?: string
          months_analyzed?: number
          recommendations: Json
          total_savings_opportunity?: number | null
          user_id: string
        }
        Update: {
          ai_powered_count?: number | null
          algorithmic_count?: number | null
          created_at?: string
          data_points?: number
          expires_at?: string
          generated_at?: string
          id?: string
          months_analyzed?: number
          recommendations?: Json
          total_savings_opportunity?: number | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          id: string
          month: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          id?: string
          month: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          id?: string
          month?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calorie_goals: {
        Row: {
          carbs_target: number | null
          created_at: string | null
          daily_calories: number
          end_date: string | null
          fat_target: number | null
          goal_type: string | null
          id: string
          notes: string | null
          protein_target: number | null
          start_date: string
          user_id: string | null
        }
        Insert: {
          carbs_target?: number | null
          created_at?: string | null
          daily_calories: number
          end_date?: string | null
          fat_target?: number | null
          goal_type?: string | null
          id?: string
          notes?: string | null
          protein_target?: number | null
          start_date?: string
          user_id?: string | null
        }
        Update: {
          carbs_target?: number | null
          created_at?: string | null
          daily_calories?: number
          end_date?: string | null
          fat_target?: number | null
          goal_type?: string | null
          id?: string
          notes?: string | null
          protein_target?: number | null
          start_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      custom_exercises: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          equipment: string | null
          id: string
          image_url: string | null
          instructions: string | null
          muscle_groups: string[] | null
          name: string
          tips: string | null
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          muscle_groups?: string[] | null
          name: string
          tips?: string | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          muscle_groups?: string[] | null
          name?: string
          tips?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      exercise_alternatives: {
        Row: {
          alternative_exercise_id: string
          created_at: string | null
          id: string
          primary_exercise_id: string
          reason: string | null
          similarity_score: number | null
        }
        Insert: {
          alternative_exercise_id: string
          created_at?: string | null
          id?: string
          primary_exercise_id: string
          reason?: string | null
          similarity_score?: number | null
        }
        Update: {
          alternative_exercise_id?: string
          created_at?: string | null
          id?: string
          primary_exercise_id?: string
          reason?: string | null
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_alternatives_alternative_exercise_id_fkey"
            columns: ["alternative_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_alternatives_alternative_exercise_id_fkey"
            columns: ["alternative_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises_with_favorites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_alternatives_primary_exercise_id_fkey"
            columns: ["primary_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_alternatives_primary_exercise_id_fkey"
            columns: ["primary_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises_with_favorites"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_favorites: {
        Row: {
          created_at: string | null
          exercise_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_favorites_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_favorites_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises_with_favorites"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          equipment: string | null
          force_type: string | null
          gif_url: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_compound: boolean | null
          muscle_groups: string[]
          name: string
          thumbnail_url: string | null
          tips: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          force_type?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_compound?: boolean | null
          muscle_groups: string[]
          name: string
          thumbnail_url?: string | null
          tips?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          force_type?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_compound?: boolean | null
          muscle_groups?: string[]
          name?: string
          thumbnail_url?: string | null
          tips?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          currency: string
          email_subject: string | null
          id: string
          merchant: string
          notes: string | null
          source: string
          transaction_date: string
          transaction_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          currency?: string
          email_subject?: string | null
          id?: string
          merchant: string
          notes?: string | null
          source: string
          transaction_date: string
          transaction_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          currency?: string
          email_subject?: string | null
          id?: string
          merchant?: string
          notes?: string | null
          source?: string
          transaction_date?: string
          transaction_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      llm_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          model: string
          prompt: string | null
          response: string | null
          status: string | null
          tokens_completion: number | null
          tokens_prompt: number | null
          tokens_total: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          model: string
          prompt?: string | null
          response?: string | null
          status?: string | null
          tokens_completion?: number | null
          tokens_prompt?: number | null
          tokens_total?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          model?: string
          prompt?: string | null
          response?: string | null
          status?: string | null
          tokens_completion?: number | null
          tokens_prompt?: number | null
          tokens_total?: number | null
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number
          carbs: number | null
          confidence: string | null
          created_at: string | null
          expense_id: string | null
          fat: number | null
          id: string
          llm_reasoning: string | null
          meal_date: string
          meal_time: string | null
          name: string
          notes: string | null
          protein: number | null
          source: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          calories: number
          carbs?: number | null
          confidence?: string | null
          created_at?: string | null
          expense_id?: string | null
          fat?: number | null
          id?: string
          llm_reasoning?: string | null
          meal_date: string
          meal_time?: string | null
          name: string
          notes?: string | null
          protein?: number | null
          source?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          calories?: number
          carbs?: number | null
          confidence?: string | null
          created_at?: string | null
          expense_id?: string | null
          fat?: number | null
          id?: string
          llm_reasoning?: string | null
          meal_date?: string
          meal_time?: string | null
          name?: string
          notes?: string | null
          protein?: number | null
          source?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meals_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          created_at: string | null
          exercise_id: string
          id: string
          notes: string | null
          record_type: string
          unit: string | null
          user_id: string
          value: number
          workout_exercise_id: string | null
        }
        Insert: {
          achieved_at: string
          created_at?: string | null
          exercise_id: string
          id?: string
          notes?: string | null
          record_type: string
          unit?: string | null
          user_id: string
          value: number
          workout_exercise_id?: string | null
        }
        Update: {
          achieved_at?: string
          created_at?: string | null
          exercise_id?: string
          id?: string
          notes?: string | null
          record_type?: string
          unit?: string | null
          user_id?: string
          value?: number
          workout_exercise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises_with_favorites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_emails: {
        Row: {
          email_account: string
          email_uid: string
          expense_id: string | null
          id: string
          processed_at: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          email_account: string
          email_uid: string
          expense_id?: string | null
          id?: string
          processed_at?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          email_account?: string
          email_uid?: string
          expense_id?: string | null
          id?: string
          processed_at?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processed_emails_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          auto_create: boolean | null
          category: string
          confidence_score: number | null
          created_at: string | null
          currency: string
          end_date: string | null
          frequency: string
          id: string
          interval_days: number | null
          is_active: boolean | null
          is_detected: boolean | null
          last_processed_date: string | null
          merchant: string
          name: string
          next_due_date: string
          notes: string | null
          notify_before_days: number | null
          skipped_dates: string[] | null
          source: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          auto_create?: boolean | null
          category?: string
          confidence_score?: number | null
          created_at?: string | null
          currency?: string
          end_date?: string | null
          frequency: string
          id?: string
          interval_days?: number | null
          is_active?: boolean | null
          is_detected?: boolean | null
          last_processed_date?: string | null
          merchant: string
          name: string
          next_due_date: string
          notes?: string | null
          notify_before_days?: number | null
          skipped_dates?: string[] | null
          source: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          auto_create?: boolean | null
          category?: string
          confidence_score?: number | null
          created_at?: string | null
          currency?: string
          end_date?: string | null
          frequency?: string
          id?: string
          interval_days?: number | null
          is_active?: boolean | null
          is_detected?: boolean | null
          last_processed_date?: string | null
          merchant?: string
          name?: string
          next_due_date?: string
          notes?: string | null
          notify_before_days?: number | null
          skipped_dates?: string[] | null
          source?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_foods: {
        Row: {
          calories: number
          carbs: number | null
          created_at: string | null
          fat: number | null
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          name: string
          notes: string | null
          portion_description: string | null
          protein: number | null
          source: string
          updated_at: string | null
          use_count: number | null
          user_id: string | null
        }
        Insert: {
          calories: number
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name: string
          notes?: string | null
          portion_description?: string | null
          protein?: number | null
          source?: string
          updated_at?: string | null
          use_count?: number | null
          user_id?: string | null
        }
        Update: {
          calories?: number
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name?: string
          notes?: string | null
          portion_description?: string | null
          protein?: number | null
          source?: string
          updated_at?: string | null
          use_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string | null
          current_amount: number | null
          deadline: string | null
          icon: string | null
          id: string
          name: string
          target_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_amount?: number | null
          deadline?: string | null
          icon?: string | null
          id?: string
          name: string
          target_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_amount?: number | null
          deadline?: string | null
          icon?: string | null
          id?: string
          name?: string
          target_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_workouts: {
        Row: {
          completed_workout_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          scheduled_date: string
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_workout_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_workout_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_completed_workout_id_fkey"
            columns: ["completed_workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "upcoming_scheduled_workouts"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "scheduled_workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achieved_at: string
          achievement_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          achievement_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          achievement_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_email_settings: {
        Row: {
          app_password: string
          created_at: string | null
          email_address: string
          id: string
          imap_host: string
          imap_port: number
          imap_tls: boolean
          is_enabled: boolean
          last_sync_at: string | null
          trusted_senders: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_password: string
          created_at?: string | null
          email_address: string
          id?: string
          imap_host?: string
          imap_port?: number
          imap_tls?: boolean
          is_enabled?: boolean
          last_sync_at?: string | null
          trusted_senders?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_password?: string
          created_at?: string | null
          email_address?: string
          id?: string
          imap_host?: string
          imap_port?: number
          imap_tls?: boolean
          is_enabled?: boolean
          last_sync_at?: string | null
          trusted_senders?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          currency: string | null
          daily_water_goal_ml: number | null
          date_format: string | null
          full_name: string | null
          has_seen_onboarding: boolean | null
          id: string
          notification_enabled: boolean | null
          target_weight: number | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          currency?: string | null
          daily_water_goal_ml?: number | null
          date_format?: string | null
          full_name?: string | null
          has_seen_onboarding?: boolean | null
          id?: string
          notification_enabled?: boolean | null
          target_weight?: number | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          currency?: string | null
          daily_water_goal_ml?: number | null
          date_format?: string | null
          full_name?: string | null
          has_seen_onboarding?: boolean | null
          id?: string
          notification_enabled?: boolean | null
          target_weight?: number | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_workout_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_workout_date: string | null
          longest_streak: number
          streak_start_date: string | null
          total_workouts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_workout_date?: string | null
          longest_streak?: number
          streak_start_date?: string | null
          total_workouts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_workout_date?: string | null
          longest_streak?: number
          streak_start_date?: string | null
          total_workouts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string | null
          date: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string
          exercise_order: number
          id: string
          max_weight: number | null
          notes: string | null
          sets: Json
          total_volume: number | null
          updated_at: string | null
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          exercise_order?: number
          id?: string
          max_weight?: number | null
          notes?: string | null
          sets: Json
          total_volume?: number | null
          updated_at?: string | null
          workout_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          exercise_order?: number
          id?: string
          max_weight?: number | null
          notes?: string | null
          sets?: Json
          total_volume?: number | null
          updated_at?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises_with_favorites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_profiles: {
        Row: {
          age: number | null
          available_equipment: string[] | null
          created_at: string | null
          experience_level: string | null
          gender: string | null
          height: number | null
          id: string
          primary_goal: string | null
          session_duration: number | null
          training_frequency: number | null
          training_location: string | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          available_equipment?: string[] | null
          created_at?: string | null
          experience_level?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          primary_goal?: string | null
          session_duration?: number | null
          training_frequency?: number | null
          training_location?: string | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          available_equipment?: string[] | null
          created_at?: string | null
          experience_level?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          primary_goal?: string | null
          session_duration?: number | null
          training_frequency?: number | null
          training_location?: string | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          exercises: Json
          id: string
          is_default: boolean | null
          name: string
          tags: string[] | null
          target_goal: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          exercises: Json
          id?: string
          is_default?: boolean | null
          name: string
          tags?: string[] | null
          target_goal?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          exercises?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          tags?: string[] | null
          target_goal?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          scheduled_date: string | null
          started_at: string | null
          status: string | null
          template_id: string | null
          total_volume: number | null
          updated_at: string | null
          user_id: string
          workout_date: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          total_volume?: number | null
          updated_at?: string | null
          user_id: string
          workout_date?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          total_volume?: number | null
          updated_at?: string | null
          user_id?: string
          workout_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "upcoming_scheduled_workouts"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      exercises_with_favorites: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          equipment: string | null
          force_type: string | null
          gif_url: string | null
          id: string | null
          image_url: string | null
          instructions: string | null
          is_compound: boolean | null
          is_favorite: boolean | null
          muscle_groups: string[] | null
          name: string | null
          thumbnail_url: string | null
          tips: string | null
          updated_at: string | null
          video_url: string | null
        }
        Relationships: []
      }
      upcoming_scheduled_workouts: {
        Row: {
          created_at: string | null
          difficulty: string | null
          duration_minutes: number | null
          exercises: Json | null
          id: string | null
          notes: string | null
          scheduled_date: string | null
          status: string | null
          template_description: string | null
          template_id: string | null
          template_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_estimated_1rm: {
        Args: { reps: number; weight: number }
        Returns: number
      }
      calculate_next_due_date: {
        Args: {
          custom_interval?: number
          frequency_type: string
          input_date: string
        }
        Returns: string
      }
      calculate_workout_volume: {
        Args: { exercise_sets: Json }
        Returns: number
      }
      cleanup_expired_budget_recommendations: { Args: never; Returns: number }
      cleanup_old_processed_emails: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
