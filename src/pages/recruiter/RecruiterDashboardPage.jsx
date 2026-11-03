import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRecruiterJobs, deleteJob } from '../../services/jobService';
import {
  Briefcase,
  Users,
  CheckCircle,
  PlusCircle,
  ExternalLink,
  Edit,
  Trash2,
  MapPin,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default function RecruiterDashboardPage() {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadJobs = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getRecruiterJobs(user.id);
      setJobs(data);
    } catch (err) {
      console.error('Error fetching recruiter jobs:', err);
      setErrorMsg('Failed to load your posted jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [user]);

  const handleDeleteJob = async (jobId, title) => {
    if (!window.confirm(`Are you sure you want to delete the job posting for "${title}"? This will also remove all associated applications.`)) {
      return;
    }

    setDeletingId(jobId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setSuccessMsg(`Job "${title}" deleted successfully.`);
    } catch (err) {
      console.error('Error deleting job:', err);
      setErrorMsg('Failed to delete job posting.');
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate high-level metrics
  const totalJobs = jobs.length;
  const totalApplicants = jobs.reduce((acc, j) => acc + (j.applicant_count || 0), 0);
  const totalShortlisted = jobs.reduce((acc, j) => acc + (j.shortlisted_count || 0), 0);

  return (
    <div className="app-container" style={{ paddingTop: 'var(--space-md)' }}>
      {/* Top Header */}
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
          <h1 className="headline-md">Recruiter Dashboard</h1>
          <p className="body-sm text-muted" style={{ marginTop: '4px' }}>
            Manage your company listings, monitor applicant volume, and evaluate AI screening scores.
          </p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn btn-primary" style={{ gap: '6px' }}>
          <PlusCircle size={16} /> Post New Job
        </Link>
      </div>

      {successMsg && (
        <div className="alert-box success" style={{ marginBottom: '20px' }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box error" style={{ marginBottom: '20px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Metric Counters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div className="hm-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-neutral)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Briefcase size={22} color="var(--color-secondary)" />
          </div>
          <div>
            <span className="label-sm text-muted">Active Job Postings</span>
            <p className="match-score-value" style={{ fontSize: '30px', marginTop: '2px' }}>
              {totalJobs}
            </p>
          </div>
        </div>

        <div className="hm-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-neutral)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} color="var(--color-primary)" />
          </div>
          <div>
            <span className="label-sm text-muted">Total Applicants</span>
            <p className="match-score-value" style={{ fontSize: '30px', marginTop: '2px', color: 'var(--color-primary)' }}>
              {totalApplicants}
            </p>
          </div>
        </div>

        <div className="hm-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-neutral)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle size={22} color="var(--color-success)" />
          </div>
          <div>
            <span className="label-sm text-muted">Shortlisted Candidates</span>
            <p className="match-score-value" style={{ fontSize: '30px', marginTop: '2px', color: 'var(--color-success)' }}>
              {totalShortlisted}
            </p>
          </div>
        </div>
      </div>

      {/* Jobs List Section */}
      <div style={{ marginTop: 'var(--space-md)' }}>
        <h2 className="label-lg" style={{ fontSize: '20px', marginBottom: '16px' }}>
          Your Job Openings
        </h2>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="body-md text-muted">Loading your job postings...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <Briefcase className="empty-state-icon" />
            <h3 className="label-lg" style={{ fontSize: '18px' }}>
              No jobs posted yet
            </h3>
            <p className="body-sm text-muted" style={{ maxWidth: '420px' }}>
              Create your first job posting to start receiving applicants ranked by AI compatibility.
            </p>
            <Link to="/recruiter/jobs/new" className="btn btn-primary" style={{ marginTop: '8px' }}>
              <PlusCircle size={16} /> Post Your First Job
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                className="hm-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 360px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="hm-chip" style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {job.job_type}
                    </span>
                    <span className="body-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {job.location}
                    </span>
                    <span className="body-sm text-muted">
                      • Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="label-lg" style={{ fontSize: '18px', marginBottom: '4px' }}>
                    {job.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                    <span className="body-sm">
                      <strong>{job.applicant_count || 0}</strong> applicants
                    </span>
                    <span className="body-sm text-muted">•</span>
                    <span className="body-sm text-success">
                      <strong>{job.shortlisted_count || 0}</strong> shortlisted
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Link
                    to={`/recruiter/jobs/${job.id}/applicants`}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '6px' }}
                  >
                    <Users size={14} /> View Applicants ({job.applicant_count || 0})
                  </Link>

                  <Link
                    to={`/recruiter/jobs/${job.id}/edit`}
                    className="btn btn-secondary btn-sm"
                    title="Edit Job"
                  >
                    <Edit size={14} /> Edit
                  </Link>

                  <button
                    onClick={() => handleDeleteJob(job.id, job.title)}
                    disabled={deletingId === job.id}
                    className="btn btn-danger btn-sm"
                    title="Delete Job"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
