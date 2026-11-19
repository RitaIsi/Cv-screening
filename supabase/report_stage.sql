-- ==============================================================================
-- HireMatch: Reporting Stage Migration
-- Adds score_breakdown (JSONB) column to applications to store the score
-- components at the time of application while preserving existing RLS policies.
-- ==============================================================================

-- 1. ADD SCORE_BREAKDOWN COLUMN TO APPLICATIONS
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB;

-- 2. ENSURE ROW LEVEL SECURITY (RLS) REMAINS ENABLED
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

