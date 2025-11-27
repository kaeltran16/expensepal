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
  public: {
    Tables: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
  public: {
    Enums: {},
  },
} as const
