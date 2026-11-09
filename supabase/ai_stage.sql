-- ==============================================================================
-- HireMatch: AI Stage Migration
-- Adds CV analysis columns to profiles, embedding column to jobs,
-- and ensures Row Level Security (RLS) rules remain active and secure.
-- ==============================================================================

-- 1. EXTEND PROFILES TABLE WITH AI CV SCREENING FIELDS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_text TEXT,
  ADD COLUMN IF NOT EXISTS cv_summary TEXT,
  ADD COLUMN IF NOT EXISTS cv_embedding FLOAT8[],
  ADD COLUMN IF NOT EXISTS cv_analyzed_at TIMESTAMPTZ;

-- 2. EXTEND JOBS TABLE WITH EMBEDDING FIELD
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS embedding FLOAT8[];

-- 3. ENSURE ROW LEVEL SECURITY (RLS) REMAINS ENABLED
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 4. PROFILES RLS POLICIES
-- Existing rule: authenticated users can read profiles for application matching.
-- Users can insert and update only their own profile.
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5. STORAGE RLS: PRESERVE ACCESS RESTRICTIONS ON CV FILES
-- Recruiters can only access CVs of candidates who applied to their jobs.
-- Candidates can access only their own CV files.
-- (Defined in schema.sql on storage.objects)

