import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getJobById } from '../../services/jobService';
import { getJobApplications, updateApplicationStatus } from '../../services/applicationService';
import { rankApplicants, getMatchingSkills, getMatchedSkills, getMissingSkills } from '../../services/aiService';
import { downloadCV, getCVSignedUrl } from '../../services/storageService';
import MatchBadge from '../../components/MatchBadge';
import StatusBadge from '../../components/StatusBadge';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  FileText,
  User,
  GraduationCap,
  Clock,
  AlertCircle,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export default function JobApplicantsPage() {
  const { id: jobId } = useParams();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const jobData = await getJobById(jobId);
        setJob(jobData);

        const apps = await getJobApplications(jobId);
        // Rank applicants strictly through the isolated AI placeholder service
        const ranked = rankApplicants(apps, jobData);
        setApplicants(ranked);
      } catch (err) {
        console.error('Error loading applicants:', err);
        setErrorMsg('Failed to fetch candidates for this job opening.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [jobId]);

  const handleStatusChange = async (applicationId, newStatus) => {
    setUpdatingId(applicationId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await updateApplicationStatus(applicationId, newStatus);
      setApplicants((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app))
      );
      setSuccessMsg(`Candidate marked as ${newStatus}.`);
    } catch (err) {
      console.error('Error updating candidate status:', err);
      setErrorMsg('Failed to update candidate status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadCV = async (app) => {
    const cvPath = app.seeker?.cv_path;
    if (!cvPath) {
      alert('No CV document path found for this candidate.');
      return;
    }

    setDownloadingId(app.id);
    try {
      const cleanName = `${(app.seeker.full_name || 'Candidate').replace(/\s+/g, '_')}_CV.pdf`;
      // Download directly or open signed URL
      try {
        await downloadCV(cvPath, cleanName);
      } catch (dlErr) {
        // Fallback to signed URL if direct blob download has restrictions
        const url = await getCVSignedUrl(cvPath);
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          throw dlErr;
        }
      }
    } catch (err) {
      console.error('Error downloading CV:', err);
      alert('Could not download CV document: ' + (err.message || 'Access error'));
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter applicants by status tab
  const filteredApplicants = applicants.filter((app) => {
    if (statusFilter === 'all') return true;
    return (app.status || 'pending').toLowerCase() === statusFilter;
  });

  const countPending = applicants.filter((a) => (a.status || 'pending').toLowerCase() === 'pending').length;
  const countShortlisted = applicants.filter((a) => a.status === 'shortlisted').length;
  const countRejected = applicants.filter((a) => a.status === 'rejected').length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="body-md text-muted">Screening and ranking candidates...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ paddingTop: 'var(--space-md)' }}>
      {/* Back button */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/recruiter/dashboard"
          className="btn-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-md)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span className="hm-chip" style={{ fontSize: '11px', marginBottom: '8px' }}>
            Job Screening
          </span>
          <h1 className="headline-md">{job?.title}</h1>
          <p className="body-sm text-muted" style={{ marginTop: '4px' }}>
            {job?.company} • {applicants.length} total applicant{applicants.length === 1 ? '' : 's'} ranked by AI match score.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="alert-box success" style={{ marginBottom: '16px' }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box error" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStatusFilter('all')}
          className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All ({applicants.length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Pending Review ({countPending})
        </button>
        <button
          onClick={() => setStatusFilter('shortlisted')}
          className={`btn btn-sm ${statusFilter === 'shortlisted' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Shortlisted ({countShortlisted})
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`btn btn-sm ${statusFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Rejected ({countRejected})
        </button>
      </div>

      {/* Applicants List */}
      {filteredApplicants.length === 0 ? (
        <div className="empty-state">
          <User className="empty-state-icon" />
          <h2 className="label-lg" style={{ fontSize: '18px' }}>
            {statusFilter === 'all'
              ? 'No candidates have applied to this job yet'
              : `No candidates currently in "${statusFilter}" status`}
          </h2>
          <p className="body-sm text-muted" style={{ maxWidth: '420px' }}>
            Candidates who apply will automatically have their qualifications scored and ranked here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredApplicants.map((app, index) => {
            const seeker = app.seeker || {};
            const seekerSkills = Array.isArray(seeker.skills) ? seeker.skills : [];
            const matchedSkills = getMatchedSkills(seeker, job);
            const missingSkills = getMissingSkills(seeker, job);
            const extraSkills = seekerSkills.filter(
              (s) => !matchedSkills.some((m) => m.toLowerCase() === s.toLowerCase())
            );

            return (
              <div
                key={app.id}
                className="hm-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Candidate Information */}
                <div style={{ flex: '1 1 360px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span className="hm-chip hm-chip-accent" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                      Rank #{index + 1}
                    </span>
                    <StatusBadge status={app.status} />
                    <span className="body-sm text-muted">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="label-lg" style={{ fontSize: '20px', marginBottom: '4px' }}>
                    {seeker.full_name || 'Anonymous Candidate'}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {seeker.education && (
                      <span className="body-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <GraduationCap size={14} /> {seeker.education}
                      </span>
                    )}
                    <span className="body-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {seeker.experience_years ?? 0} years experience
                    </span>
                  </div>

                  {/* AI CV Summary */}
                  {seeker.cv_summary && (
                    <div
                      style={{
                        marginBottom: '14px',
                        padding: '10px 14px',
                        backgroundColor: 'var(--color-neutral)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--color-primary)',
                      }}
                    >
                      <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '2px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        AI Summary
                      </span>
                      <p className="body-sm" style={{ color: 'var(--color-on-surface)', lineHeight: '1.45' }}>
                        {seeker.cv_summary}
                      </p>
                    </div>
                  )}

                  {/* Skills tags */}
                  <div>
                    <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '6px' }}>
                      Skills Evaluation:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {/* Matched required skills */}
                      {matchedSkills.map((s) => (
                        <span key={s} className="hm-chip hm-chip-accent" title="Matches job requirement">
                          ✓ {s}
                        </span>
                      ))}
                      {/* Missing required skills in muted style */}
                      {missingSkills.map((s) => (
                        <span
                          key={s}
                          className="hm-chip hm-chip-secondary"
                          style={{
                            color: 'var(--color-muted)',
                            borderColor: 'var(--color-border)',
                            opacity: 0.75,
                          }}
                          title="Missing required skill for this role"
                        >
                          ✕ {s}
                        </span>
                      ))}
                      {/* Candidate extra competencies */}
                      {extraSkills.map((s) => (
                        <span key={s} className="hm-chip" style={{ opacity: 0.75 }}>
                          {s}
                        </span>
                      ))}
                      {seekerSkills.length === 0 && missingSkills.length === 0 && (
                        <span className="body-sm text-muted">No skills listed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score and Recruiter Action Controls */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '14px',
                    flexShrink: 0,
                    width: '100%',
                  }}
                  id={`recruiter-actions-${app.id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MatchBadge score={app.match_score} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {seeker.cv_path ? (
                      <button
                        onClick={() => handleDownloadCV(app)}
                        disabled={downloadingId === app.id}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '6px' }}
                      >
                        <Download size={14} />
                        {downloadingId === app.id ? 'Downloading...' : 'Download CV'}
                      </button>
                    ) : (
                      <span className="label-sm text-muted" style={{ padding: '6px' }}>
                        No CV File
                      </span>
                    )}

                    {app.status !== 'shortlisted' && (
                      <button
                        onClick={() => handleStatusChange(app.id, 'shortlisted')}
                        disabled={updatingId === app.id}
                        className="btn btn-sm"
                        style={{
                          backgroundColor: '#ECFDF3',
                          borderColor: '#ABEFC6',
                          color: '#067647',
                          gap: '4px',
                        }}
                      >
                        <Check size={14} /> Shortlist
                      </button>
                    )}

                    {app.status !== 'rejected' && (
                      <button
                        onClick={() => handleStatusChange(app.id, 'rejected')}
                        disabled={updatingId === app.id}
                        className="btn btn-danger btn-sm"
                        style={{ gap: '4px' }}
                      >
                        <X size={14} /> Reject
                      </button>
                    )}
                  </div>
                </div>

                <style>{`
                  @media (min-width: 640px) {
                    #recruiter-actions-${app.id} {
                      width: auto !important;
                    }
                  }
                `}</style>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
