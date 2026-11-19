import { supabase } from '../lib/supabase';
import { calculateMatchScore, getScoreBreakdown } from './aiService';

/**
 * Submits an application for a seeker to a job.
 * Calculates the match score and breakdown via the isolated aiService and persists them.
 * 
 * @param {Object} params
 * @param {string} params.jobId
 * @param {string} params.seekerId
 * @param {Object} params.seekerProfile
 * @param {Object} params.job
 */
export async function applyToJob({ jobId, seekerId, seekerProfile, job }) {
  if (!seekerProfile?.cv_path) {
    throw new Error('Please upload a CV to your profile before applying to jobs.');
  }

  // Calculate match score and breakdown exclusively through aiService
  const breakdown = getScoreBreakdown(seekerProfile, job);
  const matchScore = calculateMatchScore(seekerProfile, job);

  let { data, error } = await supabase
    .from('applications')
    .insert([
      {
        job_id: jobId,
        seeker_id: seekerId,
        match_score: matchScore,
        score_breakdown: breakdown,
        status: 'pending',
      },
    ])
    .select()
    .single();

  // Graceful fallback if report_stage.sql has not been executed yet
  if (error && (error.code === '42703' || error.code === 'PGRST204' || /score_breakdown/i.test(error.message || ''))) {
    const fallbackRes = await supabase
      .from('applications')
      .insert([
        {
          job_id: jobId,
          seeker_id: seekerId,
          match_score: matchScore,
          status: 'pending',
        },
      ])
      .select()
      .single();
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already applied for this job.');
    }
    console.error('Error applying to job:', error);
    throw error;
  }

  return data;
}

/**
 * Checks if a seeker has already applied to a specific job.
 */
export async function getExistingApplication(jobId, seekerId) {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('job_id', jobId)
    .eq('seeker_id', seekerId)
    .maybeSingle();

  if (error) {
    console.error('Error checking existing application:', error);
    return null;
  }
  return data;
}

/**
 * Retrieves all applications submitted by a seeker, joined with job details.
 */
export async function getSeekerApplications(seekerId) {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      match_score,
      status,
      created_at,
      jobs:job_id (
        id,
        title,
        company,
        location,
        job_type,
        min_experience,
        required_skills
      )
    `)
    .eq('seeker_id', seekerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching seeker applications:', error);
    throw error;
  }
  return data || [];
}

/**
 * Retrieves all applications for a specific job, joined with seeker profile info.
 */
export async function getJobApplications(jobId) {
  let { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      job_id,
      seeker_id,
      match_score,
      score_breakdown,
      status,
      created_at,
      seeker:seeker_id (
        id,
        full_name,
        skills,
        experience_years,
        education,
        cv_path,
        cv_summary,
        cv_embedding
      )
    `)
    .eq('job_id', jobId);

  if (error && (error.code === '42703' || error.code === 'PGRST204' || /score_breakdown/i.test(error.message || ''))) {
    const fallbackRes = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        seeker_id,
        match_score,
        status,
        created_at,
        seeker:seeker_id (
          id,
          full_name,
          skills,
          experience_years,
          education,
          cv_path,
          cv_summary,
          cv_embedding
        )
      `)
      .eq('job_id', jobId);
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    console.error('Error fetching job applications:', error);
    throw error;
  }
  return data || [];
}

/**
 * Updates an applicant's status (e.g. 'shortlisted', 'rejected', or 'pending').
 */
export async function updateApplicationStatus(applicationId, status) {
  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
  return data;
}
