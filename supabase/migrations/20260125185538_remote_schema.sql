


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."advance_recurring_expense_due_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only advance if this expense matches a recurring expense pattern
    UPDATE recurring_expenses
    SET
        next_due_date = calculate_next_due_date(next_due_date, frequency, interval_days),
        last_processed_date = NEW.transaction_date::DATE,
        updated_at = TIMEZONE('utc', NOW())
    WHERE
        user_id = NEW.user_id
        AND is_active = true
        AND auto_create = true
        AND LOWER(TRIM(merchant)) = LOWER(TRIM(NEW.merchant))
        AND NEW.transaction_date::DATE >= next_due_date - INTERVAL '3 days'  -- Within 3 days before due
        AND NEW.transaction_date::DATE <= next_due_date + INTERVAL '7 days';  -- Or up to 7 days after

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."advance_recurring_expense_due_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_estimated_1rm"("weight" numeric, "reps" integer) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF reps = 1 THEN
    RETURN weight;
  ELSIF reps <= 12 THEN
    -- epley formula: weight * (1 + reps/30)
    RETURN weight * (1 + reps::DECIMAL / 30);
  ELSE
    -- for high reps, return weight as it's not accurate for 1RM estimation
    RETURN weight;
  END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_estimated_1rm"("weight" numeric, "reps" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_due_date"("input_date" "date", "frequency_type" "text", "custom_interval" integer DEFAULT NULL::integer) RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    RETURN CASE frequency_type
        WHEN 'weekly' THEN input_date + INTERVAL '7 days'
        WHEN 'biweekly' THEN input_date + INTERVAL '14 days'
        WHEN 'monthly' THEN input_date + INTERVAL '1 month'
        WHEN 'quarterly' THEN input_date + INTERVAL '3 months'
        WHEN 'yearly' THEN input_date + INTERVAL '1 year'
        WHEN 'custom' THEN
            CASE
                WHEN custom_interval IS NOT NULL THEN input_date + (custom_interval || ' days')::INTERVAL
                ELSE input_date + INTERVAL '30 days'  -- Default to monthly
            END
        ELSE input_date + INTERVAL '1 month'
    END;
END;
$$;


ALTER FUNCTION "public"."calculate_next_due_date"("input_date" "date", "frequency_type" "text", "custom_interval" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_workout_volume"("exercise_sets" "jsonb") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  total_volume DECIMAL := 0;
  set_data JSONB;
BEGIN
  FOR set_data IN SELECT * FROM jsonb_array_elements(exercise_sets)
  LOOP
    total_volume := total_volume +
      COALESCE((set_data->>'reps')::INT, 0) *
      COALESCE((set_data->>'weight')::DECIMAL, 0);
  END LOOP;
  RETURN total_volume;
END;
$$;


ALTER FUNCTION "public"."calculate_workout_volume"("exercise_sets" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_budget_recommendations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM budget_recommendations_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_budget_recommendations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_processed_emails"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM processed_emails
    WHERE processed_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_processed_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_custom_exercises_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_custom_exercises_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_scheduled_workouts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_scheduled_workouts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_workout_streaks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_workout_streaks_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."budget_recommendations_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "recommendations" "jsonb" NOT NULL,
    "months_analyzed" integer DEFAULT 12 NOT NULL,
    "data_points" integer NOT NULL,
    "total_savings_opportunity" bigint DEFAULT 0,
    "ai_powered_count" integer DEFAULT 0,
    "algorithmic_count" integer DEFAULT 0,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."budget_recommendations_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_recommendations_cache" IS 'Caches AI-generated budget recommendations to reduce LLM API costs. Recommendations expire after 7 days.';



COMMENT ON COLUMN "public"."budget_recommendations_cache"."recommendations" IS 'JSONB array of budget recommendation objects with category, amount, reasoning, etc.';



COMMENT ON COLUMN "public"."budget_recommendations_cache"."expires_at" IS 'Recommendations older than this should be regenerated';



CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "month" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "user_id" "uuid"
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calorie_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "daily_calories" integer NOT NULL,
    "protein_target" numeric(10,2),
    "carbs_target" numeric(10,2),
    "fat_target" numeric(10,2),
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "end_date" "date",
    "goal_type" "text" DEFAULT 'maintenance'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    CONSTRAINT "calorie_goals_goal_type_check" CHECK (("goal_type" = ANY (ARRAY['weight_loss'::"text", 'weight_gain'::"text", 'maintenance'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."calorie_goals" OWNER TO "postgres";


COMMENT ON TABLE "public"."calorie_goals" IS 'Daily calorie and macro targets';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Budget and expense categories - includes defaults (user_id=NULL) and user-created custom categories';



COMMENT ON COLUMN "public"."categories"."user_id" IS 'NULL for default categories, user ID for custom categories';



CREATE TABLE IF NOT EXISTS "public"."custom_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "muscle_groups" "text"[] DEFAULT '{}'::"text"[],
    "equipment" "text",
    "difficulty" "text",
    "video_url" "text",
    "image_url" "text",
    "instructions" "text",
    "tips" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "custom_exercises_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"])))
);


ALTER TABLE "public"."custom_exercises" OWNER TO "postgres";


COMMENT ON TABLE "public"."custom_exercises" IS 'User-created custom exercises';



CREATE TABLE IF NOT EXISTS "public"."exercise_alternatives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "primary_exercise_id" "uuid" NOT NULL,
    "alternative_exercise_id" "uuid" NOT NULL,
    "similarity_score" numeric(3,2),
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exercise_alternatives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_favorites" (
    "user_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exercise_favorites" OWNER TO "postgres";


COMMENT ON TABLE "public"."exercise_favorites" IS 'User bookmarked exercises for quick access';



CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "muscle_groups" "text"[] NOT NULL,
    "equipment" "text",
    "difficulty" "text",
    "instructions" "text",
    "tips" "text",
    "video_url" "text",
    "image_url" "text",
    "description" "text",
    "is_compound" boolean DEFAULT false,
    "force_type" "text",
    "gif_url" "text",
    "thumbnail_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "exercises_category_check" CHECK (("category" = ANY (ARRAY['strength'::"text", 'cardio'::"text", 'flexibility'::"text", 'sports'::"text"]))),
    CONSTRAINT "exercises_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "exercises_force_type_check" CHECK (("force_type" = ANY (ARRAY['push'::"text", 'pull'::"text", 'static'::"text", 'dynamic'::"text"])))
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."exercises_with_favorites" AS
 SELECT "e"."id",
    "e"."name",
    "e"."category",
    "e"."muscle_groups",
    "e"."equipment",
    "e"."difficulty",
    "e"."instructions",
    "e"."tips",
    "e"."video_url",
    "e"."image_url",
    "e"."description",
    "e"."is_compound",
    "e"."force_type",
    "e"."gif_url",
    "e"."thumbnail_url",
    "e"."created_at",
    "e"."updated_at",
        CASE
            WHEN ("ef"."user_id" IS NOT NULL) THEN true
            ELSE false
        END AS "is_favorite"
   FROM ("public"."exercises" "e"
     LEFT JOIN "public"."exercise_favorites" "ef" ON ((("e"."id" = "ef"."exercise_id") AND ("ef"."user_id" = "auth"."uid"()))));


ALTER VIEW "public"."exercises_with_favorites" OWNER TO "postgres";


COMMENT ON VIEW "public"."exercises_with_favorites" IS 'Exercise library with user favorite status';



CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_type" "text" DEFAULT 'Expense'::"text",
    "amount" numeric(15,2) NOT NULL,
    "currency" "text" DEFAULT 'VND'::"text" NOT NULL,
    "transaction_date" timestamp with time zone NOT NULL,
    "merchant" "text" NOT NULL,
    "category" "text" DEFAULT 'Other'::"text",
    "notes" "text",
    "source" "text" NOT NULL,
    "email_subject" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    CONSTRAINT "expenses_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'email'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."llm_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "model" "text" NOT NULL,
    "prompt" "text",
    "response" "text",
    "tokens_prompt" integer,
    "tokens_completion" integer,
    "tokens_total" integer,
    "duration_ms" integer,
    "status" "text"
);


ALTER TABLE "public"."llm_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "calories" integer NOT NULL,
    "protein" numeric(10,2) DEFAULT 0,
    "carbs" numeric(10,2) DEFAULT 0,
    "fat" numeric(10,2) DEFAULT 0,
    "meal_time" "text" DEFAULT 'other'::"text",
    "meal_date" timestamp with time zone NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "confidence" "text",
    "expense_id" "uuid",
    "notes" "text",
    "llm_reasoning" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    CONSTRAINT "meals_confidence_check" CHECK (("confidence" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "meals_meal_time_check" CHECK (("meal_time" = ANY (ARRAY['breakfast'::"text", 'lunch'::"text", 'dinner'::"text", 'snack'::"text", 'other'::"text"]))),
    CONSTRAINT "meals_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'llm'::"text", 'usda'::"text", 'saved'::"text", 'email'::"text"])))
);


ALTER TABLE "public"."meals" OWNER TO "postgres";


COMMENT ON TABLE "public"."meals" IS 'Daily meal logging with nutrition tracking';



CREATE TABLE IF NOT EXISTS "public"."personal_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "record_type" "text" NOT NULL,
    "value" numeric(10,2) NOT NULL,
    "unit" "text",
    "achieved_at" timestamp with time zone NOT NULL,
    "workout_exercise_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "personal_records_record_type_check" CHECK (("record_type" = ANY (ARRAY['1rm'::"text", 'max_reps'::"text", 'max_volume'::"text", 'max_weight'::"text"])))
);


ALTER TABLE "public"."personal_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_account" "text" NOT NULL,
    "email_uid" "text" NOT NULL,
    "subject" "text",
    "processed_at" timestamp with time zone DEFAULT "now"(),
    "expense_id" "uuid"
);


ALTER TABLE "public"."processed_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "user_id" "uuid"
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "merchant" "text" NOT NULL,
    "category" "text" DEFAULT 'Other'::"text" NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "currency" "text" DEFAULT 'VND'::"text" NOT NULL,
    "frequency" "text" NOT NULL,
    "interval_days" integer,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "next_due_date" "date" NOT NULL,
    "last_processed_date" "date",
    "is_active" boolean DEFAULT true,
    "auto_create" boolean DEFAULT false,
    "notify_before_days" integer DEFAULT 1,
    "is_detected" boolean DEFAULT false,
    "confidence_score" integer,
    "source" "text" NOT NULL,
    "skipped_dates" "date"[] DEFAULT ARRAY[]::"date"[],
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "recurring_expenses_frequency_check" CHECK (("frequency" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text", 'custom'::"text"]))),
    CONSTRAINT "recurring_expenses_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'detected'::"text"])))
);


ALTER TABLE "public"."recurring_expenses" OWNER TO "postgres";


COMMENT ON TABLE "public"."recurring_expenses" IS 'Stores user-defined and auto-detected recurring expenses/subscriptions with scheduling and auto-creation support';



CREATE TABLE IF NOT EXISTS "public"."saved_foods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "calories" integer NOT NULL,
    "protein" numeric(10,2) DEFAULT 0,
    "carbs" numeric(10,2) DEFAULT 0,
    "fat" numeric(10,2) DEFAULT 0,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "is_favorite" boolean DEFAULT false,
    "use_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "notes" "text",
    "portion_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    CONSTRAINT "saved_foods_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'llm'::"text", 'usda'::"text"])))
);


ALTER TABLE "public"."saved_foods" OWNER TO "postgres";


COMMENT ON TABLE "public"."saved_foods" IS 'Personal food database for quick logging';



CREATE TABLE IF NOT EXISTS "public"."savings_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "target_amount" numeric(15,2) NOT NULL,
    "current_amount" numeric(15,2) DEFAULT 0,
    "deadline" "date",
    "icon" "text" DEFAULT '🎯'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "user_id" "uuid"
);


ALTER TABLE "public"."savings_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "scheduled_date" "date" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text",
    "completed_workout_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "scheduled_workouts_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."scheduled_workouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."scheduled_workouts" IS 'User workout schedule - one workout per day per user';



CREATE TABLE IF NOT EXISTS "public"."workout_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "difficulty" "text",
    "duration_minutes" integer,
    "exercises" "jsonb" NOT NULL,
    "is_default" boolean DEFAULT false,
    "user_id" "uuid",
    "tags" "text"[],
    "target_goal" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workout_templates_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "workout_templates_target_goal_check" CHECK (("target_goal" = ANY (ARRAY['strength'::"text", 'hypertrophy'::"text", 'endurance'::"text", 'general_fitness'::"text"])))
);


ALTER TABLE "public"."workout_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."upcoming_scheduled_workouts" AS
 SELECT "sw"."id",
    "sw"."user_id",
    "sw"."scheduled_date",
    "sw"."status",
    "sw"."notes",
    "sw"."created_at",
    "sw"."updated_at",
    "wt"."id" AS "template_id",
    "wt"."name" AS "template_name",
    "wt"."description" AS "template_description",
    "wt"."difficulty",
    "wt"."duration_minutes",
    "wt"."exercises"
   FROM ("public"."scheduled_workouts" "sw"
     LEFT JOIN "public"."workout_templates" "wt" ON (("sw"."template_id" = "wt"."id")))
  WHERE (("sw"."scheduled_date" >= CURRENT_DATE) AND ("sw"."status" = 'scheduled'::"text"))
  ORDER BY "sw"."scheduled_date";


ALTER VIEW "public"."upcoming_scheduled_workouts" OWNER TO "postgres";


COMMENT ON VIEW "public"."upcoming_scheduled_workouts" IS 'Upcoming scheduled workouts with template details';



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_type" "text" NOT NULL,
    "achieved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_email_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_address" "text" NOT NULL,
    "app_password" "text" NOT NULL,
    "imap_host" "text" DEFAULT 'imap.gmail.com'::"text" NOT NULL,
    "imap_port" integer DEFAULT 993 NOT NULL,
    "imap_tls" boolean DEFAULT true NOT NULL,
    "trusted_senders" "text"[] DEFAULT ARRAY['info@card.vib.com.vn'::"text", 'no-reply@grab.com'::"text"],
    "is_enabled" boolean DEFAULT true NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_email_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "currency" "text" DEFAULT 'VND'::"text",
    "date_format" "text" DEFAULT 'YYYY-MM-DD'::"text",
    "notification_enabled" boolean DEFAULT true,
    "theme" "text" DEFAULT 'system'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "has_seen_onboarding" boolean DEFAULT false,
    "target_weight" numeric(5,2),
    "daily_water_goal_ml" integer DEFAULT 2000,
    CONSTRAINT "user_profiles_theme_check" CHECK (("theme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_workout_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_workout_date" "date",
    "streak_start_date" "date",
    "total_workouts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_workout_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_ml" integer NOT NULL,
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."water_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weight_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "weight" numeric(5,2) NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weight_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "exercise_order" integer DEFAULT 0 NOT NULL,
    "sets" "jsonb" NOT NULL,
    "notes" "text",
    "total_volume" numeric(10,2),
    "max_weight" numeric(6,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "experience_level" "text" DEFAULT 'beginner'::"text",
    "primary_goal" "text" DEFAULT 'general_fitness'::"text",
    "training_frequency" integer DEFAULT 3,
    "session_duration" integer DEFAULT 60,
    "available_equipment" "text"[] DEFAULT ARRAY['bodyweight'::"text"],
    "training_location" "text" DEFAULT 'both'::"text",
    "weight" numeric(5,2),
    "height" numeric(5,2),
    "age" integer,
    "gender" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workout_profiles_experience_level_check" CHECK (("experience_level" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "workout_profiles_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text", 'prefer_not_to_say'::"text"]))),
    CONSTRAINT "workout_profiles_primary_goal_check" CHECK (("primary_goal" = ANY (ARRAY['strength'::"text", 'hypertrophy'::"text", 'endurance'::"text", 'general_fitness'::"text"]))),
    CONSTRAINT "workout_profiles_training_frequency_check" CHECK ((("training_frequency" >= 1) AND ("training_frequency" <= 7))),
    CONSTRAINT "workout_profiles_training_location_check" CHECK (("training_location" = ANY (ARRAY['gym'::"text", 'home'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."workout_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "workout_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "duration_minutes" integer,
    "notes" "text",
    "total_volume" integer,
    "status" "text" DEFAULT 'completed'::"text",
    "scheduled_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workouts_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."budget_recommendations_cache"
    ADD CONSTRAINT "budget_recommendations_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_user_category_month_key" UNIQUE ("user_id", "category", "month");



ALTER TABLE ONLY "public"."calorie_goals"
    ADD CONSTRAINT "calorie_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_exercises"
    ADD CONSTRAINT "custom_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_alternatives"
    ADD CONSTRAINT "exercise_alternatives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_alternatives"
    ADD CONSTRAINT "exercise_alternatives_primary_exercise_id_alternative_exerc_key" UNIQUE ("primary_exercise_id", "alternative_exercise_id");



ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_pkey" PRIMARY KEY ("user_id", "exercise_id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_name_unique" UNIQUE ("name");



COMMENT ON CONSTRAINT "exercises_name_unique" ON "public"."exercises" IS 'Ensures exercise names are unique for upsert operations during data imports';



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."llm_logs"
    ADD CONSTRAINT "llm_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_user_id_exercise_id_record_type_key" UNIQUE ("user_id", "exercise_id", "record_type");



ALTER TABLE ONLY "public"."processed_emails"
    ADD CONSTRAINT "processed_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_endpoint_key" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_foods"
    ADD CONSTRAINT "saved_foods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."savings_goals"
    ADD CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_user_id_scheduled_date_key" UNIQUE ("user_id", "scheduled_date");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "unique_expense_transaction" UNIQUE ("user_id", "merchant", "amount", "transaction_date", "currency");



ALTER TABLE ONLY "public"."processed_emails"
    ADD CONSTRAINT "unique_processed_email" UNIQUE ("user_id", "email_account", "email_uid");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_type_key" UNIQUE ("user_id", "achievement_type");



ALTER TABLE ONLY "public"."user_email_settings"
    ADD CONSTRAINT "user_email_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_email_settings"
    ADD CONSTRAINT "user_email_settings_user_id_email_address_key" UNIQUE ("user_id", "email_address");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_workout_streaks"
    ADD CONSTRAINT "user_workout_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_workout_streaks"
    ADD CONSTRAINT "user_workout_streaks_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."water_logs"
    ADD CONSTRAINT "water_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_logs"
    ADD CONSTRAINT "water_logs_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."weight_logs"
    ADD CONSTRAINT "weight_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weight_logs"
    ADD CONSTRAINT "weight_logs_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_profiles"
    ADD CONSTRAINT "workout_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_profiles"
    ADD CONSTRAINT "workout_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."workout_templates"
    ADD CONSTRAINT "workout_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "categories_default_name_unique" ON "public"."categories" USING "btree" ("name") WHERE ("user_id" IS NULL);



CREATE UNIQUE INDEX "categories_user_name_unique" ON "public"."categories" USING "btree" ("user_id", "name") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_budget_recommendations_cache_expires_at" ON "public"."budget_recommendations_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_budget_recommendations_cache_user_id" ON "public"."budget_recommendations_cache" USING "btree" ("user_id");



CREATE INDEX "idx_budget_recommendations_cache_user_months" ON "public"."budget_recommendations_cache" USING "btree" ("user_id", "months_analyzed", "expires_at");



CREATE INDEX "idx_budgets_user_id" ON "public"."budgets" USING "btree" ("user_id");



CREATE INDEX "idx_calorie_goals_active" ON "public"."calorie_goals" USING "btree" ("start_date" DESC, "end_date") WHERE ("end_date" IS NULL);



CREATE INDEX "idx_calorie_goals_user_id" ON "public"."calorie_goals" USING "btree" ("user_id");



CREATE INDEX "idx_categories_user_id" ON "public"."categories" USING "btree" ("user_id");



CREATE INDEX "idx_custom_exercises_name" ON "public"."custom_exercises" USING "btree" ("user_id", "name");



CREATE INDEX "idx_custom_exercises_user" ON "public"."custom_exercises" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_exercise_alternatives_primary" ON "public"."exercise_alternatives" USING "btree" ("primary_exercise_id");



CREATE INDEX "idx_exercise_favorites_user" ON "public"."exercise_favorites" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_exercises_category" ON "public"."exercises" USING "btree" ("category");



CREATE INDEX "idx_exercises_difficulty" ON "public"."exercises" USING "btree" ("difficulty");



CREATE INDEX "idx_exercises_muscle_groups" ON "public"."exercises" USING "gin" ("muscle_groups");



CREATE INDEX "idx_expenses_category" ON "public"."expenses" USING "btree" ("category");



CREATE INDEX "idx_expenses_merchant" ON "public"."expenses" USING "btree" ("merchant");



CREATE INDEX "idx_expenses_source" ON "public"."expenses" USING "btree" ("source");



CREATE INDEX "idx_expenses_transaction_date" ON "public"."expenses" USING "btree" ("transaction_date" DESC);



CREATE INDEX "idx_expenses_user_id" ON "public"."expenses" USING "btree" ("user_id");



CREATE INDEX "idx_meals_expense_id" ON "public"."meals" USING "btree" ("expense_id");



CREATE INDEX "idx_meals_meal_date" ON "public"."meals" USING "btree" ("meal_date" DESC);



CREATE INDEX "idx_meals_meal_time" ON "public"."meals" USING "btree" ("meal_time");



CREATE INDEX "idx_meals_source" ON "public"."meals" USING "btree" ("source");



CREATE INDEX "idx_meals_user_id" ON "public"."meals" USING "btree" ("user_id");



CREATE INDEX "idx_personal_records_achieved_at" ON "public"."personal_records" USING "btree" ("achieved_at" DESC);



CREATE INDEX "idx_personal_records_user_exercise" ON "public"."personal_records" USING "btree" ("user_id", "exercise_id");



CREATE INDEX "idx_processed_emails_date" ON "public"."processed_emails" USING "btree" ("processed_at" DESC);



CREATE INDEX "idx_processed_emails_lookup" ON "public"."processed_emails" USING "btree" ("user_id", "email_account", "email_uid");



CREATE INDEX "idx_processed_emails_user" ON "public"."processed_emails" USING "btree" ("user_id");



CREATE INDEX "idx_push_subscriptions_endpoint" ON "public"."push_subscriptions" USING "btree" ("endpoint");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_recurring_expenses_auto_create" ON "public"."recurring_expenses" USING "btree" ("auto_create") WHERE ("auto_create" = true);



CREATE INDEX "idx_recurring_expenses_is_active" ON "public"."recurring_expenses" USING "btree" ("is_active");



CREATE INDEX "idx_recurring_expenses_merchant" ON "public"."recurring_expenses" USING "btree" ("merchant");



CREATE INDEX "idx_recurring_expenses_next_due_date" ON "public"."recurring_expenses" USING "btree" ("next_due_date");



CREATE INDEX "idx_recurring_expenses_user_id" ON "public"."recurring_expenses" USING "btree" ("user_id");



CREATE INDEX "idx_saved_foods_favorite" ON "public"."saved_foods" USING "btree" ("is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX "idx_saved_foods_name" ON "public"."saved_foods" USING "btree" ("name");



CREATE INDEX "idx_saved_foods_use_count" ON "public"."saved_foods" USING "btree" ("use_count" DESC);



CREATE INDEX "idx_saved_foods_user_id" ON "public"."saved_foods" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_saved_foods_user_name" ON "public"."saved_foods" USING "btree" ("user_id", "name");



CREATE INDEX "idx_savings_goals_user_id" ON "public"."savings_goals" USING "btree" ("user_id");



CREATE INDEX "idx_scheduled_workouts_template" ON "public"."scheduled_workouts" USING "btree" ("template_id") WHERE ("template_id" IS NOT NULL);



CREATE INDEX "idx_scheduled_workouts_user_date" ON "public"."scheduled_workouts" USING "btree" ("user_id", "scheduled_date" DESC);



CREATE INDEX "idx_user_achievements_type" ON "public"."user_achievements" USING "btree" ("achievement_type");



CREATE INDEX "idx_user_achievements_user_id" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "idx_user_email_settings_enabled" ON "public"."user_email_settings" USING "btree" ("is_enabled");



CREATE INDEX "idx_user_email_settings_user_id" ON "public"."user_email_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_user_workout_streaks_user_id" ON "public"."user_workout_streaks" USING "btree" ("user_id");



CREATE INDEX "idx_water_logs_date" ON "public"."water_logs" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_water_logs_user_id" ON "public"."water_logs" USING "btree" ("user_id");



CREATE INDEX "idx_weight_logs_date" ON "public"."weight_logs" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_weight_logs_user_id" ON "public"."weight_logs" USING "btree" ("user_id");



CREATE INDEX "idx_workout_exercises_exercise_id" ON "public"."workout_exercises" USING "btree" ("exercise_id");



CREATE INDEX "idx_workout_exercises_workout_id" ON "public"."workout_exercises" USING "btree" ("workout_id");



CREATE INDEX "idx_workout_profiles_user_id" ON "public"."workout_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_workout_templates_tags" ON "public"."workout_templates" USING "gin" ("tags");



CREATE INDEX "idx_workout_templates_user_id" ON "public"."workout_templates" USING "btree" ("user_id");



CREATE INDEX "idx_workouts_date" ON "public"."workouts" USING "btree" ("workout_date" DESC);



CREATE INDEX "idx_workouts_status" ON "public"."workouts" USING "btree" ("user_id", "status");



CREATE INDEX "idx_workouts_user_id" ON "public"."workouts" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "advance_recurring_on_expense_insert" AFTER INSERT ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."advance_recurring_expense_due_date"();



CREATE OR REPLACE TRIGGER "custom_exercises_updated_at" BEFORE UPDATE ON "public"."custom_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."update_custom_exercises_updated_at"();



CREATE OR REPLACE TRIGGER "scheduled_workouts_updated_at" BEFORE UPDATE ON "public"."scheduled_workouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_scheduled_workouts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_workout_streaks_updated_at" BEFORE UPDATE ON "public"."user_workout_streaks" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_workout_streaks_updated_at"();



CREATE OR REPLACE TRIGGER "update_budgets_updated_at" BEFORE UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_meals_updated_at" BEFORE UPDATE ON "public"."meals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_push_subscriptions_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recurring_expenses_updated_at" BEFORE UPDATE ON "public"."recurring_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_saved_foods_updated_at" BEFORE UPDATE ON "public"."saved_foods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_savings_goals_updated_at" BEFORE UPDATE ON "public"."savings_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_email_settings_updated_at" BEFORE UPDATE ON "public"."user_email_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_water_logs_updated_at" BEFORE UPDATE ON "public"."water_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_weight_logs_updated_at" BEFORE UPDATE ON "public"."weight_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_workout_templates_updated_at" BEFORE UPDATE ON "public"."workout_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_workouts_updated_at" BEFORE UPDATE ON "public"."workouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_profiles_updated_at"();



ALTER TABLE ONLY "public"."budget_recommendations_cache"
    ADD CONSTRAINT "budget_recommendations_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calorie_goals"
    ADD CONSTRAINT "calorie_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_exercises"
    ADD CONSTRAINT "custom_exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_alternatives"
    ADD CONSTRAINT "exercise_alternatives_alternative_exercise_id_fkey" FOREIGN KEY ("alternative_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_alternatives"
    ADD CONSTRAINT "exercise_alternatives_primary_exercise_id_fkey" FOREIGN KEY ("primary_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."processed_emails"
    ADD CONSTRAINT "processed_emails_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."processed_emails"
    ADD CONSTRAINT "processed_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_foods"
    ADD CONSTRAINT "saved_foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_goals"
    ADD CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_completed_workout_id_fkey" FOREIGN KEY ("completed_workout_id") REFERENCES "public"."workouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_email_settings"
    ADD CONSTRAINT "user_email_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_workout_streaks"
    ADD CONSTRAINT "user_workout_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."water_logs"
    ADD CONSTRAINT "water_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weight_logs"
    ADD CONSTRAINT "weight_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_profiles"
    ADD CONSTRAINT "workout_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_templates"
    ADD CONSTRAINT "workout_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all operations on categories" ON "public"."categories" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can view categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Anyone can view exercise alternatives" ON "public"."exercise_alternatives" FOR SELECT USING (true);



CREATE POLICY "Anyone can view exercises" ON "public"."exercises" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Default categories are viewable by everyone" ON "public"."categories" FOR SELECT USING (("user_id" IS NULL));



CREATE POLICY "Service role can delete meals" ON "public"."meals" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Service role can insert meals" ON "public"."meals" FOR INSERT TO "service_role" WITH CHECK (true);



COMMENT ON POLICY "Service role can insert meals" ON "public"."meals" IS 'Allows email sync service to automatically create meal entries';



CREATE POLICY "Service role can insert saved_foods" ON "public"."saved_foods" FOR INSERT TO "service_role" WITH CHECK (true);



COMMENT ON POLICY "Service role can insert saved_foods" ON "public"."saved_foods" IS 'Allows calorie estimator to cache LLM results';



CREATE POLICY "Service role can manage processed emails" ON "public"."processed_emails" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can select meals" ON "public"."meals" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role can select saved_foods" ON "public"."saved_foods" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role can update meals" ON "public"."meals" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "Service role can update saved_foods" ON "public"."saved_foods" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "Users can create own custom categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own personal records" ON "public"."personal_records" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own profile" ON "public"."workout_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own templates" ON "public"."workout_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own workout exercises" ON "public"."workout_exercises" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_exercises"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own workouts" ON "public"."workouts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own custom categories" ON "public"."categories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own custom exercises" ON "public"."custom_exercises" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own exercise favorites" ON "public"."exercise_favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own scheduled workouts" ON "public"."scheduled_workouts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own budget recommendations" ON "public"."budget_recommendations_cache" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own budgets" ON "public"."budgets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own calorie_goals" ON "public"."calorie_goals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own email settings" ON "public"."user_email_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own expenses" ON "public"."expenses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own meals" ON "public"."meals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own personal records" ON "public"."personal_records" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own profile" ON "public"."user_profiles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own push subscriptions" ON "public"."push_subscriptions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own recurring expenses" ON "public"."recurring_expenses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own saved_foods" ON "public"."saved_foods" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own savings goals" ON "public"."savings_goals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own templates" ON "public"."workout_templates" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own water logs" ON "public"."water_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own weight logs" ON "public"."weight_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own workout exercises" ON "public"."workout_exercises" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_exercises"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own workouts" ON "public"."workouts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own custom exercises" ON "public"."custom_exercises" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own exercise favorites" ON "public"."exercise_favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own scheduled workouts" ON "public"."scheduled_workouts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own achievements" ON "public"."user_achievements" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own budget recommendations" ON "public"."budget_recommendations_cache" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own budgets" ON "public"."budgets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own calorie_goals" ON "public"."calorie_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own email settings" ON "public"."user_email_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own expenses" ON "public"."expenses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own meals" ON "public"."meals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own processed emails" ON "public"."processed_emails" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own push subscriptions" ON "public"."push_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own recurring expenses" ON "public"."recurring_expenses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own saved_foods" ON "public"."saved_foods" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own savings goals" ON "public"."savings_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own streaks" ON "public"."user_workout_streaks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own water logs" ON "public"."water_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own weight logs" ON "public"."weight_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own custom categories" ON "public"."categories" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own custom exercises" ON "public"."custom_exercises" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own scheduled workouts" ON "public"."scheduled_workouts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own budget recommendations" ON "public"."budget_recommendations_cache" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own budgets" ON "public"."budgets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own calorie_goals" ON "public"."calorie_goals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own email settings" ON "public"."user_email_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own expenses" ON "public"."expenses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own meals" ON "public"."meals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own personal records" ON "public"."personal_records" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."workout_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own push subscriptions" ON "public"."push_subscriptions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own recurring expenses" ON "public"."recurring_expenses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own saved_foods" ON "public"."saved_foods" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own savings goals" ON "public"."savings_goals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own streaks" ON "public"."user_workout_streaks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own templates" ON "public"."workout_templates" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own water logs" ON "public"."water_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own weight logs" ON "public"."weight_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own workout exercises" ON "public"."workout_exercises" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_exercises"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own workouts" ON "public"."workouts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view default templates" ON "public"."workout_templates" FOR SELECT USING ((("is_default" = true) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can view own custom categories" ON "public"."categories" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own custom exercises" ON "public"."custom_exercises" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own exercise favorites" ON "public"."exercise_favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own scheduled workouts" ON "public"."scheduled_workouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own achievements" ON "public"."user_achievements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own budget recommendations" ON "public"."budget_recommendations_cache" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own budgets" ON "public"."budgets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own calorie_goals" ON "public"."calorie_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own email settings" ON "public"."user_email_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own expenses" ON "public"."expenses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own meals" ON "public"."meals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own personal records" ON "public"."personal_records" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own processed emails" ON "public"."processed_emails" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."workout_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own push subscriptions" ON "public"."push_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own recurring expenses" ON "public"."recurring_expenses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own saved_foods" ON "public"."saved_foods" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own savings goals" ON "public"."savings_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own streaks" ON "public"."user_workout_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own water logs" ON "public"."water_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own weight logs" ON "public"."weight_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own workout exercises" ON "public"."workout_exercises" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workouts"
  WHERE (("workouts"."id" = "workout_exercises"."workout_id") AND ("workouts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own workouts" ON "public"."workouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."budget_recommendations_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calorie_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise_alternatives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."llm_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processed_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_foods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."savings_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_workouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_email_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_workout_streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."water_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weight_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."advance_recurring_expense_due_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."advance_recurring_expense_due_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_recurring_expense_due_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_estimated_1rm"("weight" numeric, "reps" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_estimated_1rm"("weight" numeric, "reps" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_estimated_1rm"("weight" numeric, "reps" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("input_date" "date", "frequency_type" "text", "custom_interval" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("input_date" "date", "frequency_type" "text", "custom_interval" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("input_date" "date", "frequency_type" "text", "custom_interval" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_workout_volume"("exercise_sets" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_workout_volume"("exercise_sets" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_workout_volume"("exercise_sets" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_budget_recommendations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_budget_recommendations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_budget_recommendations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_processed_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_processed_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_processed_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_custom_exercises_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_custom_exercises_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_custom_exercises_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_scheduled_workouts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_scheduled_workouts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_scheduled_workouts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_workout_streaks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_workout_streaks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_workout_streaks_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."budget_recommendations_cache" TO "anon";
GRANT ALL ON TABLE "public"."budget_recommendations_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_recommendations_cache" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."calorie_goals" TO "anon";
GRANT ALL ON TABLE "public"."calorie_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."calorie_goals" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."custom_exercises" TO "anon";
GRANT ALL ON TABLE "public"."custom_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_alternatives" TO "anon";
GRANT ALL ON TABLE "public"."exercise_alternatives" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_alternatives" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_favorites" TO "anon";
GRANT ALL ON TABLE "public"."exercise_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."exercises_with_favorites" TO "anon";
GRANT ALL ON TABLE "public"."exercises_with_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises_with_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."llm_logs" TO "anon";
GRANT ALL ON TABLE "public"."llm_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."llm_logs" TO "service_role";



GRANT ALL ON TABLE "public"."meals" TO "anon";
GRANT ALL ON TABLE "public"."meals" TO "authenticated";
GRANT ALL ON TABLE "public"."meals" TO "service_role";



GRANT ALL ON TABLE "public"."personal_records" TO "anon";
GRANT ALL ON TABLE "public"."personal_records" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_records" TO "service_role";



GRANT ALL ON TABLE "public"."processed_emails" TO "anon";
GRANT ALL ON TABLE "public"."processed_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."processed_emails" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_expenses" TO "anon";
GRANT ALL ON TABLE "public"."recurring_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."saved_foods" TO "anon";
GRANT ALL ON TABLE "public"."saved_foods" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_foods" TO "service_role";



GRANT ALL ON TABLE "public"."savings_goals" TO "anon";
GRANT ALL ON TABLE "public"."savings_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_goals" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_workouts" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_workouts" TO "service_role";



GRANT ALL ON TABLE "public"."workout_templates" TO "anon";
GRANT ALL ON TABLE "public"."workout_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_templates" TO "service_role";



GRANT ALL ON TABLE "public"."upcoming_scheduled_workouts" TO "anon";
GRANT ALL ON TABLE "public"."upcoming_scheduled_workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."upcoming_scheduled_workouts" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_email_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_email_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_email_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_workout_streaks" TO "anon";
GRANT ALL ON TABLE "public"."user_workout_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_workout_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."water_logs" TO "anon";
GRANT ALL ON TABLE "public"."water_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."water_logs" TO "service_role";



GRANT ALL ON TABLE "public"."weight_logs" TO "anon";
GRANT ALL ON TABLE "public"."weight_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."weight_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workout_exercises" TO "anon";
GRANT ALL ON TABLE "public"."workout_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."workout_profiles" TO "anon";
GRANT ALL ON TABLE "public"."workout_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "anon";
GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































