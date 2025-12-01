-- Migration: Revert workout tracking system
-- Description: Drop all workout-related tables from 014_add_workout_tracking.sql

-- drop policies first
DROP POLICY IF EXISTS "Users can delete their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can update their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can create their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can view their own workout exercises" ON workout_exercises;

DROP POLICY IF EXISTS "Users can delete their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can create their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can view their own workouts" ON workouts;

DROP POLICY IF EXISTS "Users can delete their own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can view default templates" ON workout_templates;

DROP POLICY IF EXISTS "Anyone can view exercises" ON exercises;

-- drop triggers
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;

-- drop tables (in reverse dependency order)
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS workout_templates CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
