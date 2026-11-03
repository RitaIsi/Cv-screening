/**
 * ==============================================================================
 * AI SERVICE PLACEHOLDER (HireMatch Thesis Project)
 * ==============================================================================
 * 
 * IMPORTANT ARCHITECTURAL NOTE:
 * This file serves as the single, strictly isolated integration point for the
 * upcoming AI engine. In the future, this placeholder will be replaced by:
 *   1. Resume / CV text extraction and OCR (parsing PDF/DOCX content)
 *   2. Semantic embedding generation (via sentence transformers / LLM embeddings)
 *   3. Vector cosine similarity matching & contextual experience evaluation
 * 
 * DESIGN RULE:
 * No other file or component in the codebase may implement match scoring or
 * ranking logic. All pages and services must call this service exclusively.
 * ==============================================================================
 */

/**
 * Normalizes a skill string for comparison (trim and lowercase).
 * @param {string} skill
 * @returns {string}
 */
const normalizeSkill = (skill) => (skill || '').trim().toLowerCase();

/**
 * Returns the subset of skills from jobSkills that the candidate possesses.
 * (Case-insensitive matching)
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
 * Calculates a match score (0 - 100) between a job seeker profile and a job posting.
 * 
 * Current Thesis Baseline Formula:
 * - 70% Skill Overlap: proportion of required skills possessed by the seeker.
 * - 30% Experience Met: seeker's years of experience compared to min_experience required.
 * 
 * Future AI Integration:
 * This function will invoke an LLM/NLP microservice to evaluate semantic relevance,
 * domain context, resume text embeddings, and qualitative project descriptions.
 * 
 * @param {Object} seekerProfile - Seeker profile with { skills, experience_years }
 * @param {Object} job - Job posting with { required_skills, min_experience }
 * @returns {number} Integer between 0 and 100
 */
export function calculateMatchScore(seekerProfile = {}, job = {}) {
  const seekerSkills = Array.isArray(seekerProfile?.skills) ? seekerProfile.skills : [];
  const jobSkills = Array.isArray(job?.required_skills) ? job.required_skills : [];

  const seekerExp = Number(seekerProfile?.experience_years) || 0;
  const minExp = Number(job?.min_experience) || 0;

  // 1. Skill overlap calculation (70% weight)
  let skillScore = 0;
  if (jobSkills.length === 0) {
    // If no required skills are specified, candidate receives full skill points
    skillScore = 70;
  } else {
    const matched = getMatchingSkills(seekerSkills, jobSkills);
    const overlapRatio = Math.min(1, matched.length / jobSkills.length);
    skillScore = overlapRatio * 70;
  }

  // 2. Experience calculation (30% weight)
  let expScore = 0;
  if (minExp <= 0) {
    // No minimum experience required
    expScore = 30;
  } else {
    const expRatio = Math.min(1, seekerExp / minExp);
    expScore = expRatio * 30;
  }

  const totalScore = Math.round(skillScore + expScore);
  return Math.max(0, Math.min(100, totalScore));
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
    const matchedSkills = getMatchingSkills(seekerProfile?.skills, job.required_skills);
    return {
      ...job,
      match_score: score,
      matched_skills: matchedSkills
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
    // Candidate profile may be on app.seeker, app.profiles, or app directly
    const profile = app.seeker || app.profiles || app;
    // If application already has a saved match_score, recalculate or use saved
    const score = calculateMatchScore(profile, job);
    const matchedSkills = getMatchingSkills(profile?.skills, job?.required_skills);

    return {
      ...app,
      match_score: score,
      matched_skills: matchedSkills
    };
  });

  return scoredApplicants.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
}
