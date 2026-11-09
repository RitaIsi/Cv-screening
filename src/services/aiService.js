/**
 * ==============================================================================
 * AI SERVICE (HireMatch CV Screening & Recommendation Engine)
 * ==============================================================================
 * 
 * ARCHITECTURAL DESIGN:
 * This service handles candidate-job compatibility scoring and integration
 * with the Gemini AI Edge Function ('ai-screen').
 * 
 * SCORING DESIGN:
 * The scoring and ranking methods (calculateMatchScore, rankJobsForSeeker, rankApplicants)
 * are strictly client-side synchronous computations comparing data already stored
 * in the database. They make ZERO AI/API calls during ranking, ensuring:
 *   - Instant sub-millisecond evaluation
 *   - Zero consumption of API quota or rate limits during page loads
 * 
 * SCORING FORMULA (0 - 100 Integer):
 * When both CV embedding and job embedding are available:
 *   - 50% Semantic Similarity: Cosine similarity between cv_embedding and job.embedding
 *   - 35% Skill Overlap: Proportion of job.required_skills matched by candidate skills
 *   - 15% Experience Met: Candidate experience_years against job.min_experience
 * 
 * FALLBACK FORMULA:
 * If either embedding is missing:
 *   - 70% Skill Overlap
 *   - 30% Experience Met
 * 
 * EDGE FUNCTION CALLS:
 *   - analyzeCv(cvText): Extracts structured skills, years, education, summary & embedding
 *   - embedJob(job): Computes 768-dim embedding for job description and skills
 *   - backfillJobs(): Embeds seed/un-embedded jobs for recruiters using service role
 * ==============================================================================
 */

import { supabase } from '../lib/supabase.js';

/**
 * Normalizes a skill string for comparison (trim and lowercase).
 * @param {string} skill
 * @returns {string}
 */
export const normalizeSkill = (skill) => (skill || '').trim().toLowerCase();

/**
 * Computes cosine similarity between two numeric vectors.
 * Returns a float between -1.0 and 1.0 (or 0 if invalid).
 * 
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number}
 */
export function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    const a = Number(vecA[i]) || 0;
    const b = Number(vecB[i]) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA <= 0 || normB <= 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Helper to collect all candidate skills from profile.
 * @param {Object} profile 
 * @returns {string[]}
 */
function extractProfileSkills(profile) {
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const cvSkills = Array.isArray(profile?.cv_skills) ? profile.cv_skills : [];
  return [...skills, ...cvSkills];
}

/**
 * Returns the subset of skills from job.required_skills that the candidate possesses.
 * (Case-insensitive matching)
 * 
 * @param {Object} profile 
 * @param {Object} job 
 * @returns {string[]}
 */
export function getMatchedSkills(profile = {}, job = {}) {
  const candidateSkills = extractProfileSkills(profile);
  const requiredSkills = Array.isArray(job?.required_skills) ? job.required_skills : [];
  if (requiredSkills.length === 0) return [];
  const normalizedCandidate = new Set(candidateSkills.map(normalizeSkill));
  return requiredSkills.filter((rs) => normalizedCandidate.has(normalizeSkill(rs)));
}

/**
 * Legacy alias for backwards compatibility with earlier components.
 * 
 * @param {string[]} seekerSkills 
 * @param {string[]} jobSkills 
 * @returns {string[]}
 */
export function getMatchingSkills(seekerSkills = [], jobSkills = []) {
  if (!Array.isArray(seekerSkills) || !Array.isArray(jobSkills)) return [];
  const normalizedSeeker = new Set(seekerSkills.map(normalizeSkill));
  return jobSkills.filter((js) => normalizedSeeker.has(normalizeSkill(js)));
}

/**
 * Returns the subset of skills from job.required_skills that the candidate lacks.
 * (Case-insensitive matching)
 * 
 * @param {Object} profile 
 * @param {Object} job 
 * @returns {string[]}
 */
export function getMissingSkills(profile = {}, job = {}) {
  const candidateSkills = extractProfileSkills(profile);
  const requiredSkills = Array.isArray(job?.required_skills) ? job.required_skills : [];
  if (requiredSkills.length === 0) return [];
  const normalizedCandidate = new Set(candidateSkills.map(normalizeSkill));
  return requiredSkills.filter((rs) => !normalizedCandidate.has(normalizeSkill(rs)));
}

/**
 * Calculates a match score (0 - 100) between a job seeker profile and a job posting.
 * Uses 50% semantic similarity + 35% skills + 15% experience when embeddings exist,
 * otherwise falls back cleanly to 70% skills + 30% experience.
 * 
 * @param {Object} seekerProfile - Seeker profile with { skills, experience_years, cv_embedding }
 * @param {Object} job - Job posting with { required_skills, min_experience, embedding }
 * @returns {number} Integer between 0 and 100
 */
export function calculateMatchScore(seekerProfile = {}, job = {}) {
  const candidateSkills = extractProfileSkills(seekerProfile);
  const jobSkills = Array.isArray(job?.required_skills) ? job.required_skills : [];
  const seekerExp = Number(seekerProfile?.experience_years) || 0;
  const minExp = Number(job?.min_experience) || 0;

  // Calculate skill overlap ratio
  let skillRatio = 1;
  if (jobSkills.length > 0) {
    const matched = getMatchingSkills(candidateSkills, jobSkills);
    skillRatio = Math.min(1, matched.length / jobSkills.length);
  }

  // Calculate experience ratio
  let expRatio = 1;
  if (minExp > 0) {
    expRatio = Math.min(1, seekerExp / minExp);
  }

  const cvEmbedding = seekerProfile?.cv_embedding;
  const jobEmbedding = job?.embedding;
  const hasEmbeddings =
    Array.isArray(cvEmbedding) &&
    cvEmbedding.length > 0 &&
    Array.isArray(jobEmbedding) &&
    jobEmbedding.length > 0;

  if (hasEmbeddings) {
    // 50% Semantic similarity, 35% Skill overlap, 15% Experience
    const rawCosine = cosineSimilarity(cvEmbedding, jobEmbedding);
    // Cosine similarity typically ranges 0.0 - 1.0 for positive semantic relevance
    const semanticRatio = Math.max(0, Math.min(1, rawCosine));

    const semanticScore = semanticRatio * 50;
    const skillScore = skillRatio * 35;
    const expScore = expRatio * 15;

    const total = Math.round(semanticScore + skillScore + expScore);
    return Math.max(0, Math.min(100, total));
  }

  // Fallback formula: 70% Skills, 30% Experience
  const skillScore = skillRatio * 70;
  const expScore = expRatio * 30;
  const total = Math.round(skillScore + expScore);
  return Math.max(0, Math.min(100, total));
}

/**
 * Ranks an array of job postings for a given seeker profile.
 * Computes the match score for each job and returns the jobs sorted
 * in descending order of score.
 * 
 * @param {Object} seekerProfile 
 * @param {Array<Object>} jobs 
 * @returns {Array<Object>} Jobs sorted by match_score descending, with score attached
 */
export function rankJobsForSeeker(seekerProfile = {}, jobs = []) {
  if (!Array.isArray(jobs)) return [];

  const scoredJobs = jobs.map((job) => {
    const score = calculateMatchScore(seekerProfile, job);
    const matchedSkills = getMatchedSkills(seekerProfile, job);
    return {
      ...job,
      match_score: score,
      matched_skills: matchedSkills,
    };
  });

  return scoredJobs.sort((a, b) => b.match_score - a.match_score);
}

/**
 * Ranks an array of applicants for a given job posting.
 * Sorts applicants in descending order of match score.
 * 
 * @param {Array<Object>} applicants - List of application objects with applicant/seeker profile
 * @param {Object} job - The job posting object
 * @returns {Array<Object>} Applicants sorted by match_score descending
 */
export function rankApplicants(applicants = [], job = {}) {
  if (!Array.isArray(applicants)) return [];

  const scoredApplicants = applicants.map((app) => {
    const profile = app.seeker || app.profiles || app;
    const score = calculateMatchScore(profile, job);
    const matchedSkills = getMatchedSkills(profile, job);
    const missingSkills = getMissingSkills(profile, job);

    return {
      ...app,
      match_score: score,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
    };
  });

  return scoredApplicants.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
}

/**
 * Calls the Supabase Edge Function to analyze CV text and generate embedding.
 * 
 * @param {string} cvText 
 * @returns {Promise<{ success: boolean, analysis: { skills: string[], experience_years: number, education: string, summary: string }, embedding: number[] }>}
 */
export async function analyzeCv(cvText) {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      const timeoutErr = new Error('AI screening took too long. You can fill in your details manually.');
      timeoutErr.code = 'AI_TIMEOUT';
      reject(timeoutErr);
    }, 45000);
  });

  const invokePromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-screen', {
        body: {
          action: 'analyze_cv',
          cv_text: cvText,
        },
      });

      if (error) {
        let errorMsg = error.message || 'AI CV analysis failed.';
        // Check for 546 (Edge runtime timeout), 504, 408, or AI_TIMEOUT
        if (
          error.status === 546 ||
          error.status === 504 ||
          error.status === 408 ||
          errorMsg.includes('546') ||
          errorMsg.includes('AI_TIMEOUT') ||
          errorMsg.toLowerCase().includes('timed out')
        ) {
          const timeoutErr = new Error('AI screening took too long. You can fill in your details manually.');
          timeoutErr.code = 'AI_TIMEOUT';
          throw timeoutErr;
        }

        // Handle status 429
        if (error.status === 429 || (error.context && error.context.status === 429)) {
          const rateLimitErr = new Error('The AI is busy, please try again in a minute.');
          rateLimitErr.code = 'RATE_LIMIT_EXCEEDED';
          throw rateLimitErr;
        }

        throw new Error(errorMsg);
      }

      if (!data?.success) {
        if (data?.code === 'AI_TIMEOUT') {
          const timeoutErr = new Error(data.error || 'AI screening took too long. You can fill in your details manually.');
          timeoutErr.code = 'AI_TIMEOUT';
          throw timeoutErr;
        }
        if (data?.code === 'RATE_LIMIT_EXCEEDED') {
          const rateLimitErr = new Error(data.error || 'The AI is busy, please try again in a minute.');
          rateLimitErr.code = 'RATE_LIMIT_EXCEEDED';
          throw rateLimitErr;
        }
        throw new Error(data?.error || 'AI CV analysis failed.');
      }

      return data;
    } finally {
      clearTimeout(timerId);
    }
  })();

  return await Promise.race([invokePromise, timeoutPromise]);
}

/**
 * Calls the Supabase Edge Function to generate an embedding for a job posting.
 * 
 * @param {Object} job 
 * @param {string} job.title
 * @param {string} job.description
 * @param {string[]|string} job.required_skills
 * @returns {Promise<{ success: boolean, embedding: number[] }>}
 */
export async function embedJob(job) {
  const { data, error } = await supabase.functions.invoke('ai-screen', {
    body: {
      action: 'embed_job',
      title: job.title,
      description: job.description,
      required_skills: job.required_skills,
    },
  });

  if (error) {
    if (error.status === 429 || (error.context && error.context.status === 429)) {
      const rateLimitErr = new Error('The AI is busy, please try again in a minute.');
      rateLimitErr.code = 'RATE_LIMIT_EXCEEDED';
      throw rateLimitErr;
    }
    throw new Error(error.message || 'Job embedding generation failed.');
  }

  if (!data?.success) {
    if (data?.code === 'RATE_LIMIT_EXCEEDED') {
      const rateLimitErr = new Error(data.error || 'The AI is busy, please try again in a minute.');
      rateLimitErr.code = 'RATE_LIMIT_EXCEEDED';
      throw rateLimitErr;
    }
    throw new Error(data?.error || 'Job embedding generation failed.');
  }

  return data;
}

/**
 * Calls the Supabase Edge Function to backfill embeddings for all jobs missing them.
 * Accessible only by logged-in recruiters.
 * 
 * @returns {Promise<{ success: boolean, count: number, total: number }>}
 */
export async function backfillJobs() {
  const { data, error } = await supabase.functions.invoke('ai-screen', {
    body: {
      action: 'backfill_jobs',
    },
  });

  if (error) {
    if (error.status === 429 || (error.context && error.context.status === 429)) {
      const rateLimitErr = new Error('The AI is busy, please try again in a minute.');
      rateLimitErr.code = 'RATE_LIMIT_EXCEEDED';
      throw rateLimitErr;
    }
    throw new Error(error.message || 'Job backfill failed.');
  }

  if (!data?.success) {
    if (data?.code === 'RATE_LIMIT_EXCEEDED') {
      const rateLimitErr = new Error(data.error || 'The AI is busy, please try again in a minute.');
      rateLimitErr.code = 'RATE_LIMIT_EXCEEDED';
      throw rateLimitErr;
    }
    throw new Error(data?.error || 'Job backfill failed.');
  }

  return data;
}
