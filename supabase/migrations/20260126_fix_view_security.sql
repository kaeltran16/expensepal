-- Fix security for views that were publicly accessible
-- Remove anon access from exercises_with_favorites and upcoming_scheduled_workouts views

-- Revoke anon access from exercises_with_favorites view
REVOKE ALL ON TABLE "public"."exercises_with_favorites" FROM "anon";

-- Revoke anon access from upcoming_scheduled_workouts view
REVOKE ALL ON TABLE "public"."upcoming_scheduled_workouts" FROM "anon";

-- Keep authenticated and service_role access
-- (These are already granted, just confirming they remain)
GRANT SELECT ON TABLE "public"."exercises_with_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises_with_favorites" TO "service_role";

GRANT SELECT ON TABLE "public"."upcoming_scheduled_workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."upcoming_scheduled_workouts" TO "service_role";

-- Also make the views use SECURITY INVOKER (default, but being explicit)
-- This ensures RLS policies on underlying tables are respected
ALTER VIEW "public"."exercises_with_favorites" SET (security_invoker = on);
ALTER VIEW "public"."upcoming_scheduled_workouts" SET (security_invoker = on);
