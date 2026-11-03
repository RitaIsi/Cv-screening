import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getJobById } from '../../services/jobService';
import { applyToJob, getExistingApplication } from '../../services/applicationService';
import { calculateMatchScore, getMatchingSkills } from '../../services/aiService';
import MatchBadge from '../../components/MatchBadge';
import StatusBadge from '../../components/StatusBadge';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Send,
} from 'lucide-react';

export default function JobDetailsPage() {
  const { id: jobId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [existingApp, setExistingApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const jobData = await getJobById(jobId);
        setJob(jobData);

        if (user) {
          const app = await getExistingApplication(jobId, user.id);
          setExistingApp(app);
        }
      } catch (err) {
        console.error('Error fetching job details:', err);
        setErrorMsg('Unable to find or load the requested job posting.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [jobId, user]);

  const handleApply = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!profile?.cv_path) {
      setErrorMsg('You must upload a CV to your profile before submitting an application.');
      return;
    }

    setApplying(true);
    try {
      const createdApp = await applyToJob({
        jobId,
        seekerId: user.id,
        seekerProfile: profile,
        job,
      });
      setExistingApp(createdApp);
      setSuccessMsg('Your application and calculated match profile have been submitted to the recruiter!');
    } catch (err) {
      console.error('Error applying:', err);
      setErrorMsg(err.message || 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="body-md text-muted">Loading job specifications...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="app-container" style={{ paddingTop: 'var(--space-lg)' }}>
        <div className="empty-state">
          <AlertCircle className="empty-state-icon" />
          <h2 className="headline-sm">Job Posting Not Found</h2>
          <p className="body-sm text-muted">
            The job you are looking for may have been removed or is no longer accepting applications.
          </p>
          <Link to="/seeker/jobs" className="btn btn-secondary" style={{ marginTop: '12px' }}>
            <ArrowLeft size={16} /> Back to Recommended Jobs
          </Link>
        </div>
      </div>
    );
  }

  // Calculate live match statistics
  const matchScore = calculateMatchScore(profile, job);
  const matchedSkills = getMatchingSkills(profile?.skills, job.required_skills);
  const missingSkills = (job.required_skills || []).filter(
    (s) => !matchedSkills.some((m) => m.toLowerCase() === s.toLowerCase())
  );
  const seekerExp = profile?.experience_years || 0;
  const meetsExperience = seekerExp >= (job.min_experience || 0);

  return (
    <div className="app-container" style={{ maxWidth: '840px', paddingTop: 'var(--space-md)' }}>
      {/* Back button */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/seeker/jobs"
          className="btn-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to all jobs
        </Link>
      </div>

      {successMsg && (
        <div className="alert-box success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box error" style={{ marginBottom: '20px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Job Header Card */}
      <div className="hm-card" style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span className="hm-chip hm-chip-secondary">{job.job_type}</span>
              <span className="body-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} /> {job.location}
              </span>
            </div>
            <h1 className="headline-sm" style={{ fontSize: '26px' }}>
              {job.title}
            </h1>
            <p className="body-md text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Building2 size={16} /> {job.company}
            </p>
          </div>

          <MatchBadge score={existingApp ? existingApp.match_score : matchScore} />
        </div>

        {/* Status or Apply Action Block */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {existingApp ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span className="label-md">Application Status:</span>
              <StatusBadge status={existingApp.status} />
              <span className="body-sm text-muted">
                Applied on {new Date(existingApp.created_at).toLocaleDateString()}
              </span>
            </div>
          ) : !profile?.cv_path ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)' }}>
                <AlertCircle size={18} />
                <span className="label-sm">CV required to apply for this position.</span>
              </div>
              <Link to="/seeker/profile" className="btn btn-primary btn-sm">
                <Upload size={14} /> Upload CV First
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="var(--color-muted)" />
                <span className="body-sm text-muted">
                  Applying with CV on file (
                  {profile.cv_path.split('/').pop()?.replace(/^\d+_/, '')}
                  )
                </span>
              </div>
              <button
                onClick={handleApply}
                disabled={applying}
                className="btn btn-primary"
                style={{ minWidth: '140px' }}
              >
                {applying ? 'Submitting...' : (
                  <>
                    <Send size={15} /> Submit Application
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Match Breakdown Card */}
      <div className="hm-card hm-card-neutral" style={{ marginBottom: '24px' }}>
        <h2 className="label-lg" style={{ fontSize: '18px', marginBottom: '12px' }}>
          Candidate Match Breakdown
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <span className="label-sm text-muted">Skills Overlap (70% weight)</span>
            <p className="label-md" style={{ marginTop: '2px', color: 'var(--color-secondary)' }}>
              {matchedSkills.length} of {(job.required_skills || []).length} required skills
            </p>
          </div>
          <div>
            <span className="label-sm text-muted">Experience Requirement (30% weight)</span>
            <p className="label-md" style={{ marginTop: '2px' }}>
              {meetsExperience ? (
                <span style={{ color: 'var(--color-success)' }}>
                  ✓ {seekerExp} yrs experience (Min: {job.min_experience} yrs)
                </span>
              ) : (
                <span style={{ color: 'var(--color-error)' }}>
                  ⚠ {seekerExp} yrs experience (Min: {job.min_experience} yrs)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Matching Skills */}
        <div style={{ marginTop: '16px' }}>
          <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '6px' }}>
            Matching Skills
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {matchedSkills.length > 0 ? (
              matchedSkills.map((s) => (
                <span key={s} className="hm-chip hm-chip-accent">
                  ✓ {s}
                </span>
              ))
            ) : (
              <span className="body-sm text-muted">No direct skill matches from your profile.</span>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        {missingSkills.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '6px' }}>
              Missing Required Skills
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {missingSkills.map((s) => (
                <span key={s} className="hm-chip" style={{ opacity: 0.65 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Job Description & Requirements */}
      <div className="hm-card">
        <h2 className="label-lg" style={{ fontSize: '18px', marginBottom: '14px' }}>
          Job Description
        </h2>
        <div
          className="body-md"
          style={{ whiteSpace: 'pre-line', lineHeight: '1.7', color: 'var(--color-on-surface)' }}
        >
          {job.description}
        </div>

        <h3 className="label-lg" style={{ fontSize: '16px', marginTop: '24px', marginBottom: '10px' }}>
          All Required Skills
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(job.required_skills || []).map((s) => (
            <span key={s} className="hm-chip">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
