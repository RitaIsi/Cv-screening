import { supabase } from '../lib/supabase';

/**
 * Fetches all active job postings.
 */
export async function getAllJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error in getAllJobs:', error);
    throw error;
  }
  return data || [];
}

/**
 * Fetches a single job by ID.
 */
export async function getJobById(jobId) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    console.error('Error in getJobById:', error);
    throw error;
  }
  return data;
}

/**
 * Fetches jobs posted by a specific recruiter, along with applicant metrics.
 */
export async function getRecruiterJobs(recruiterId) {
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*, applications(id, status)')
    .eq('recruiter_id', recruiterId)
    .order('created_at', { ascending: false });

  if (jobsError) {
    console.error('Error in getRecruiterJobs:', jobsError);
    throw jobsError;
  }

  // Calculate applicant counts per job
  return (jobs || []).map((job) => {
    const apps = job.applications || [];
    const shortlistedCount = apps.filter((a) => a.status === 'shortlisted').length;
    return {
      ...job,
      applicant_count: apps.length,
      shortlisted_count: shortlistedCount,
    };
  });
}

/**
 * Creates a new job posting.
 */
export async function createJob(jobData) {
  const { data, error } = await supabase
    .from('jobs')
    .insert([jobData])
    .select()
    .single();

  if (error) {
    console.error('Error in createJob:', error);
    throw error;
  }
  return data;
}

/**
 * Updates an existing job posting.
 */
export async function updateJob(jobId, jobData) {
  const { data, error } = await supabase
    .from('jobs')
    .update(jobData)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    console.error('Error in updateJob:', error);
    throw error;
  }
  return data;
}

/**
 * Deletes a job posting.
 */
export async function deleteJob(jobId) {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (error) {
    console.error('Error in deleteJob:', error);
    throw error;
  }
  return true;
}
