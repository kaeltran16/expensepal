-- Routines Feature Migration
-- Creates tables for routine templates, completions, gamification, challenges, and journal

-- Predefined routine steps (library of common steps)
CREATE TABLE IF NOT EXISTS "public"."routine_steps" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "name" text NOT NULL,
    "description" text,
    "tips" text,
    "image_url" text,
    "gif_url" text,
    "category" text NOT NULL CHECK (category IN ('skincare', 'hygiene', 'morning', 'evening', 'fitness', 'mindfulness')),
    "duration_seconds" integer DEFAULT 60,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW())
);

-- User custom steps
CREATE TABLE IF NOT EXISTS "public"."custom_routine_steps" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "tips" text,
    "image_url" text,
    "gif_url" text,
    "category" text,
    "duration_seconds" integer DEFAULT 60,
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW())
);

-- Routine templates
CREATE TABLE IF NOT EXISTS "public"."routine_templates" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "icon" text, -- emoji
    "time_of_day" text CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
    "estimated_minutes" integer,
    "steps" jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{step_id, order, notes?, custom_duration?}]
    "is_default" boolean DEFAULT false,
    "tags" text[],
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW()),
    "updated_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW())
);

-- Completed routines
CREATE TABLE IF NOT EXISTS "public"."routine_completions" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "template_id" uuid REFERENCES routine_templates(id) ON DELETE SET NULL,
    "routine_date" date NOT NULL DEFAULT CURRENT_DATE,
    "time_of_day" text,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "duration_minutes" integer,
    "steps_completed" jsonb, -- [{step_id, step_name, completed_at, skipped?}]
    "xp_earned" integer DEFAULT 0,
    "bonus_xp" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW())
);

-- User routine streaks
CREATE TABLE IF NOT EXISTS "public"."user_routine_streaks" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_routine_date" date,
    "total_completions" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW()),
    "updated_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW())
);

-- User XP & Level stats
CREATE TABLE IF NOT EXISTS "public"."user_routine_stats" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    "total_xp" integer DEFAULT 0,
    "current_level" integer DEFAULT 1,
    "lifetime_routines" integer DEFAULT 0,
    "perfect_weeks" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW()),
    "updated_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW())
);

-- Journal entries for routines
CREATE TABLE IF NOT EXISTS "public"."routine_journal_entries" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "routine_completion_id" uuid REFERENCES routine_completions(id) ON DELETE SET NULL,
    "entry_date" date NOT NULL DEFAULT CURRENT_DATE,
    "mood" text CHECK (mood IN ('great', 'good', 'okay', 'tired', 'stressed')),
    "energy_level" integer CHECK (energy_level BETWEEN 1 AND 5),
    "notes" text,
    "tags" text[],
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW())
);

-- Challenges
CREATE TABLE IF NOT EXISTS "public"."routine_challenges" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "name" text NOT NULL,
    "description" text,
    "icon" text,
    "challenge_type" text CHECK (challenge_type IN ('weekly', 'monthly', 'special')),
    "requirement_type" text NOT NULL, -- 'completion_count', 'streak_days', 'total_minutes'
    "requirement_value" integer NOT NULL,
    "requirement_metadata" jsonb,
    "xp_reward" integer NOT NULL,
    "start_date" date,
    "end_date" date,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW())
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS "public"."user_challenge_progress" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "challenge_id" uuid NOT NULL REFERENCES routine_challenges(id) ON DELETE CASCADE,
    "current_progress" integer DEFAULT 0,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "xp_claimed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE("user_id", "challenge_id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_routine_completions_user_date ON routine_completions(user_id, routine_date DESC);
CREATE INDEX IF NOT EXISTS idx_routine_templates_user ON routine_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_routine_steps_user ON custom_routine_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_journal_user_date ON routine_journal_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id);

-- Enable Row Level Security
ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routine_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routine_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- routine_steps: Anyone can read default steps
CREATE POLICY "routine_steps_read_all" ON routine_steps FOR SELECT USING (true);

-- custom_routine_steps: Users can CRUD their own
CREATE POLICY "custom_routine_steps_user_isolation" ON custom_routine_steps
    FOR ALL USING (user_id = auth.uid());

-- routine_templates: Users can read defaults + their own, CRUD their own
CREATE POLICY "routine_templates_select" ON routine_templates
    FOR SELECT USING (is_default = true OR user_id = auth.uid());

CREATE POLICY "routine_templates_insert" ON routine_templates
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "routine_templates_update" ON routine_templates
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "routine_templates_delete" ON routine_templates
    FOR DELETE USING (user_id = auth.uid());

-- routine_completions: Users can CRUD their own
CREATE POLICY "routine_completions_user_isolation" ON routine_completions
    FOR ALL USING (user_id = auth.uid());

-- user_routine_streaks: Users can CRUD their own
CREATE POLICY "user_routine_streaks_user_isolation" ON user_routine_streaks
    FOR ALL USING (user_id = auth.uid());

-- user_routine_stats: Users can CRUD their own
CREATE POLICY "user_routine_stats_user_isolation" ON user_routine_stats
    FOR ALL USING (user_id = auth.uid());

-- routine_journal_entries: Users can CRUD their own
CREATE POLICY "routine_journal_entries_user_isolation" ON routine_journal_entries
    FOR ALL USING (user_id = auth.uid());

-- routine_challenges: Anyone can read active challenges
CREATE POLICY "routine_challenges_read_active" ON routine_challenges
    FOR SELECT USING (is_active = true);

-- user_challenge_progress: Users can CRUD their own
CREATE POLICY "user_challenge_progress_user_isolation" ON user_challenge_progress
    FOR ALL USING (user_id = auth.uid());

-- Function to update streak on routine completion
CREATE OR REPLACE FUNCTION "public"."update_routine_streak"()
RETURNS trigger AS $$
DECLARE
    last_date DATE;
    current_streak_val INTEGER;
    longest_streak_val INTEGER;
    total_completions_val INTEGER;
BEGIN
    -- Get current streak data
    SELECT last_routine_date, current_streak, longest_streak, total_completions
    INTO last_date, current_streak_val, longest_streak_val, total_completions_val
    FROM user_routine_streaks
    WHERE user_id = NEW.user_id;

    -- If no streak record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_routine_streaks (user_id, current_streak, longest_streak, last_routine_date, total_completions)
        VALUES (NEW.user_id, 1, 1, NEW.routine_date, 1);
        RETURN NEW;
    END IF;

    -- If already completed a routine today, just update
    IF last_date = NEW.routine_date THEN
        UPDATE user_routine_streaks
        SET total_completions = total_completions + 1,
            updated_at = TIMEZONE('utc', NOW())
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    END IF;

    -- Check if this extends the streak (yesterday or same day)
    IF last_date = NEW.routine_date - INTERVAL '1 day' THEN
        current_streak_val := current_streak_val + 1;
    ELSIF last_date < NEW.routine_date - INTERVAL '1 day' THEN
        -- Streak broken, reset to 1
        current_streak_val := 1;
    END IF;

    -- Update longest streak if needed
    IF current_streak_val > longest_streak_val THEN
        longest_streak_val := current_streak_val;
    END IF;

    -- Update the streak record
    UPDATE user_routine_streaks
    SET current_streak = current_streak_val,
        longest_streak = longest_streak_val,
        last_routine_date = NEW.routine_date,
        total_completions = total_completions + 1,
        updated_at = TIMEZONE('utc', NOW())
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update streak on routine completion
DROP TRIGGER IF EXISTS on_routine_completion ON routine_completions;
CREATE TRIGGER on_routine_completion
    AFTER INSERT ON routine_completions
    FOR EACH ROW
    EXECUTE FUNCTION update_routine_streak();

-- Function to initialize user stats
CREATE OR REPLACE FUNCTION "public"."init_user_routine_stats"()
RETURNS trigger AS $$
BEGIN
    -- Create stats record if not exists
    INSERT INTO user_routine_stats (user_id, total_xp, current_level, lifetime_routines, perfect_weeks)
    VALUES (NEW.user_id, NEW.xp_earned + COALESCE(NEW.bonus_xp, 0), 1, 1, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = user_routine_stats.total_xp + NEW.xp_earned + COALESCE(NEW.bonus_xp, 0),
        lifetime_routines = user_routine_stats.lifetime_routines + 1,
        updated_at = TIMEZONE('utc', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stats on routine completion
DROP TRIGGER IF EXISTS on_routine_completion_stats ON routine_completions;
CREATE TRIGGER on_routine_completion_stats
    AFTER INSERT ON routine_completions
    FOR EACH ROW
    EXECUTE FUNCTION init_user_routine_stats();

-- Insert some default routine steps
INSERT INTO routine_steps (name, description, tips, category, duration_seconds, is_default) VALUES
('Cleanser', 'Wash your face with a gentle cleanser', 'Use lukewarm water and massage in circular motions for 60 seconds', 'skincare', 60, true),
('Toner', 'Apply toner to balance skin pH', 'Pat gently into skin, don''t rub', 'skincare', 30, true),
('Serum', 'Apply your treatment serum', 'Let it absorb for 30 seconds before next step', 'skincare', 30, true),
('Moisturizer', 'Apply moisturizer to hydrate skin', 'Use upward motions to prevent pulling skin down', 'skincare', 30, true),
('Sunscreen', 'Apply SPF 30+ sunscreen', 'Use 2 finger lengths for face, reapply every 2 hours', 'skincare', 30, true),
('Brush Teeth', 'Brush teeth for 2 minutes', 'Use gentle circular motions, don''t forget your tongue', 'hygiene', 120, true),
('Floss', 'Floss between all teeth', 'Use a clean section of floss for each gap', 'hygiene', 60, true),
('Mouthwash', 'Rinse with mouthwash', 'Swish for 30 seconds, don''t rinse with water after', 'hygiene', 30, true),
('Stretch', 'Full body morning stretch', 'Hold each stretch for 15-30 seconds, breathe deeply', 'morning', 300, true),
('Hydrate', 'Drink a glass of water', 'Room temperature water is easier on your system', 'morning', 30, true),
('Journal', 'Write in your gratitude journal', 'List 3 things you''re grateful for', 'morning', 300, true),
('Meditation', 'Practice mindfulness meditation', 'Focus on your breath, let thoughts pass without judgment', 'mindfulness', 600, true),
('Deep Breathing', 'Practice deep breathing exercises', 'Inhale for 4 counts, hold for 7, exhale for 8', 'mindfulness', 300, true),
('Wind Down', 'Prepare for sleep', 'Dim lights, avoid screens, read or listen to calm music', 'evening', 900, true),
('Warm Up', 'Light cardio to prepare for workout', 'Get your heart rate up gradually', 'fitness', 300, true),
('Cool Down', 'Stretch and recover after workout', 'Hold stretches, focus on worked muscle groups', 'fitness', 300, true)
ON CONFLICT DO NOTHING;

-- Insert some default challenges
INSERT INTO routine_challenges (name, description, icon, challenge_type, requirement_type, requirement_value, xp_reward, is_active) VALUES
('Early Bird', 'Complete 5 morning routines this week', '🌅', 'weekly', 'completion_count', 5, 200, true),
('Consistency King', 'Maintain a 7-day streak', '🔥', 'weekly', 'streak_days', 7, 300, true),
('Monthly Master', 'Complete 25 routines this month', '🏆', 'monthly', 'completion_count', 25, 500, true),
('Mindful Month', 'Log 10 mindfulness sessions', '🧘', 'monthly', 'completion_count', 10, 300, true),
('Perfect Week', 'Complete at least one routine every day for a week', '⭐', 'weekly', 'streak_days', 7, 400, true)
ON CONFLICT DO NOTHING;
