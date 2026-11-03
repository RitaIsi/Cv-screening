import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllJobs } from '../../services/jobService';
import { rankJobsForSeeker } from '../../services/aiService';
import MatchBadge from '../../components/MatchBadge';
import { Search, Briefcase, MapPin, Clock, ArrowRight, AlertCircle, FileText } from 'lucide-react';

export default function RecommendedJobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        const rawJobs = await getAllJobs();
        // Rank jobs strictly using the AI service placeholder
        const ranked = rankJobsForSeeker(profile, rawJobs);
        setJobs(ranked);
      } catch (err) {
        console.error('Error loading jobs:', err);
        setErrorMsg('Failed to fetch job opportunities. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [profile]);

  // Filter jobs by search query
  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = job.title?.toLowerCase().includes(q);
    const companyMatch = job.company?.toLowerCase().includes(q);
    const locationMatch = job.location?.toLowerCase().includes(q);
    const skillsMatch = (job.required_skills || []).some((s) => s.toLowerCase().includes(q));
    return titleMatch || companyMatch || locationMatch || skillsMatch;
  });

  return (
    <div className="app-container" style={{ paddingTop: 'var(--space-md)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <h1 className="headline-md">Recommended Opportunities</h1>
        <p className="body-sm text-muted" style={{ marginTop: '4px' }}>
          Jobs sorted by compatibility score based on your profile skills and experience.
        </p>
      </div>

      {/* CV Missing Banner Alert */}
      {!profile?.cv_path && (
        <div className="alert-box warning" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Upload your CV to apply:</strong> You currently have no CV on file. Recruiters require a resume document before accepting applications.
          </div>
          <Link to="/seeker/profile" className="btn btn-secondary btn-sm" style={{ alignSelf: 'center' }}>
            Upload CV
          </Link>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={18}
            color="var(--color-muted)"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by job title, company, location, or skill..."
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="alert-box error">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="body-md text-muted">Calculating match scores &amp; ranking positions...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        /* Empty State */
        <div className="empty-state">
          <Briefcase className="empty-state-icon" />
          <h2 className="label-lg" style={{ fontSize: '18px' }}>
            {searchQuery ? 'No matching jobs found' : 'No jobs available yet'}
          </h2>
          <p className="body-sm text-muted" style={{ maxWidth: '420px' }}>
            {searchQuery
              ? `No openings match "${searchQuery}". Try broadening your search or clearing filters.`
              : 'Recruiters have not posted any active positions yet. Check back soon!'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '8px' }}
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : (
        /* Job Card List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredJobs.map((job) => {
            const matchedSkills = job.matched_skills || [];
            const otherSkills = (job.required_skills || []).filter(
              (s) => !matchedSkills.some((m) => m.toLowerCase() === s.toLowerCase())
            );

            return (
              <div
                key={job.id}
                className="hm-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Left info column */}
                <div style={{ flex: '1 1 360px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span className="hm-chip" style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {job.job_type}
                    </span>
                    <span className="body-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} /> {job.location}
                    </span>
                    <span className="body-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> {job.min_experience > 0 ? `${job.min_experience}+ yrs exp` : 'Entry level'}
                    </span>
                  </div>

                  <h2 className="label-lg" style={{ fontSize: '20px', marginBottom: '4px' }}>
                    <Link
                      to={`/seeker/jobs/${job.id}`}
                      style={{ color: 'var(--color-on-surface)', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-on-surface)')}
                    >
                      {job.title}
                    </Link>
                  </h2>

                  <p className="body-sm text-muted" style={{ marginBottom: '14px' }}>
                    {job.company}
                  </p>

                  {/* Skills Section with Matched Skills Highlighted */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {matchedSkills.map((s) => (
                      <span key={s} className="hm-chip hm-chip-accent" title="Matching skill from your profile">
                        ✓ {s}
                      </span>
                    ))}
                    {otherSkills.map((s) => (
                      <span key={s} className="hm-chip" style={{ opacity: 0.85 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right score and action column */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexShrink: 0,
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                  id={`job-actions-${job.id}`}
                >
                  <MatchBadge score={job.match_score} />
                  <Link
                    to={`/seeker/jobs/${job.id}`}
                    className="btn btn-secondary"
                    style={{ minWidth: '100px' }}
                  >
                    View Details <ArrowRight size={14} />
                  </Link>
                </div>

                <style>{`
                  @media (min-width: 640px) {
                    #job-actions-${job.id} {
                      width: auto !important;
                      justify-content: flex-end !important;
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
