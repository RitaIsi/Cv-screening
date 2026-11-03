-- ==============================================================================
-- HireMatch: AI-Based CV Screening and Job Recommendation System
-- Database Schema & Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
-- Stores profile details for both Seekers and Recruiters.
-- id matches auth.users.id
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('seeker', 'recruiter')),
  skills TEXT[] DEFAULT '{}',
  experience_years INT DEFAULT 0,
  education TEXT DEFAULT '',
  cv_path TEXT DEFAULT NULL,
  company_name TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. JOBS TABLE
-- Stores job postings created by recruiters.
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'Full-time', -- e.g. 'Full-time', 'Part-time', 'Remote', 'Contract', 'Hybrid'
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  min_experience INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. APPLICATIONS TABLE
-- Stores candidate applications with AI match score.
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_score INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_job_seeker UNIQUE (job_id, seeker_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON public.jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_seeker_id ON public.applications(seeker_id);
CREATE INDEX IF NOT EXISTS idx_applications_match_score ON public.applications(match_score DESC);

-- 5. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- Automatically creates a row in public.profiles when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    company_name,
    skills,
    experience_years,
    education
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seeker'),
    NEW.raw_user_meta_data->>'company_name',
    '{}',
    0,
    ''
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ROW LEVEL SECURITY (RLS) CONFIGURATION

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Authenticated users can view their own profile, or recruiters can view candidate profiles, or candidates can view recruiter profiles
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- JOBS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can view jobs (seekers browse all jobs, recruiters view jobs)
DROP POLICY IF EXISTS "Allow authenticated users to view all jobs" ON public.jobs;
CREATE POLICY "Allow authenticated users to view all jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (true);

-- Public/anon can view jobs if landing page showcases jobs
DROP POLICY IF EXISTS "Allow anon users to view jobs" ON public.jobs;
CREATE POLICY "Allow anon users to view jobs"
  ON public.jobs FOR SELECT
  TO anon
  USING (true);

-- Recruiters can insert jobs where recruiter_id = auth.uid()
DROP POLICY IF EXISTS "Recruiters can insert their own jobs" ON public.jobs;
CREATE POLICY "Recruiters can insert their own jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = recruiter_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'recruiter')
  );

-- Recruiters can update only their own jobs
DROP POLICY IF EXISTS "Recruiters can update their own jobs" ON public.jobs;
CREATE POLICY "Recruiters can update their own jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- Recruiters can delete only their own jobs
DROP POLICY IF EXISTS "Recruiters can delete their own jobs" ON public.jobs;
CREATE POLICY "Recruiters can delete their own jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = recruiter_id);

-- ------------------------------------------------------------------------------
-- APPLICATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Seekers can view their own applications
DROP POLICY IF EXISTS "Seekers can view their own applications" ON public.applications;
CREATE POLICY "Seekers can view their own applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = seeker_id OR
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.recruiter_id = auth.uid()
    )
  );

-- Seekers can create applications for themselves
DROP POLICY IF EXISTS "Seekers can submit applications" ON public.applications;
CREATE POLICY "Seekers can submit applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seeker_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'seeker')
  );

-- Recruiters can update application status for their jobs (Shortlist / Reject)
DROP POLICY IF EXISTS "Recruiters can update application status for their jobs" ON public.applications;
CREATE POLICY "Recruiters can update application status for their jobs"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.recruiter_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.recruiter_id = auth.uid()
    )
  );

-- Seekers can delete/withdraw their own applications
DROP POLICY IF EXISTS "Seekers can withdraw their own applications" ON public.applications;
CREATE POLICY "Seekers can withdraw their own applications"
  ON public.applications FOR DELETE
  TO authenticated
  USING (auth.uid() = seeker_id);

-- ------------------------------------------------------------------------------
-- 7. STORAGE BUCKET: "cvs"
-- ------------------------------------------------------------------------------
-- Create the private cvs bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cvs',
  'cvs',
  false,
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880;

-- Storage RLS:
-- 1. Seeker can upload/insert their own CV in their folder: {seeker_id}/{filename}
DROP POLICY IF EXISTS "Seekers can upload their own CV" ON storage.objects;
CREATE POLICY "Seekers can upload their own CV"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Seeker can update/replace their own CV
DROP POLICY IF EXISTS "Seekers can update their own CV" ON storage.objects;
CREATE POLICY "Seekers can update their own CV"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Seeker can delete their own CV
DROP POLICY IF EXISTS "Seekers can delete their own CV" ON storage.objects;
CREATE POLICY "Seekers can delete their own CV"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Seekers can read their own CV, AND recruiters can read CVs of candidates who applied to their jobs
DROP POLICY IF EXISTS "Access to CVs for owners and job recruiters" ON storage.objects;
CREATE POLICY "Access to CVs for owners and job recruiters"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cvs' AND (
      -- Seeker reading their own CV
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- Recruiter reading applicant CV
      EXISTS (
        SELECT 1 FROM public.applications a
        JOIN public.jobs j ON a.job_id = j.id
        WHERE j.recruiter_id = auth.uid()
        AND a.seeker_id::text = (storage.foldername(name))[1]
      )
    )
  );
