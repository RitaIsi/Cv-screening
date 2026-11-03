import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSeekerApplications } from '../../services/applicationService';
import MatchBadge from '../../components/MatchBadge';
import StatusBadge from '../../components/StatusBadge';
import { Briefcase, ArrowRight, Calendar, MapPin, Building2, AlertCircle } from 'lucide-react';

export default function SeekerApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadApps() {
      if (!user) return;
      try {
        setLoading(true);
        const data = await getSeekerApplications(user.id);
        setApplications(data);
      } catch (err) {
        console.error('Error loading applications:', err);
        setErrorMsg('Failed to fetch your applications. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadApps();
  }, [user]);

  return (
    <div className="app-container" style={{ paddingTop: 'var(--space-md)' }}>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <h1 className="headline-md">My Applications</h1>
        <p className="body-sm text-muted" style={{ marginTop: '4px' }}>
          Track the screening status and match rating for all positions you have applied for.
        </p>
      </div>

      {errorMsg && (
        <div className="alert-box error" style={{ marginBottom: '20px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="body-md text-muted">Retrieving your submitted applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <Briefcase className="empty-state-icon" />
          <h2 className="label-lg" style={{ fontSize: '18px' }}>
            No applications submitted yet
          </h2>
          <p className="body-sm text-muted" style={{ maxWidth: '420px' }}>
            Explore open opportunities ranked according to your skill profile and submit your resume.
          </p>
          <Link to="/seeker/jobs" className="btn btn-primary" style={{ marginTop: '8px' }}>
            Browse Recommended Jobs <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map((app) => {
            const job = app.jobs;
            return (
              <div
                key={app.id}
                className="hm-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <StatusBadge status={app.status} />
                    {job?.job_type && (
                      <span className="hm-chip" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {job.job_type}
                      </span>
                    )}
                    <span className="body-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> Applied {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="label-lg" style={{ fontSize: '18px', marginBottom: '2px' }}>
                    {job?.title || 'Unknown Position'}
                  </h2>

                  <p className="body-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{job?.company}</span>
                    {job?.location && (
                      <>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={12} /> {job.location}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexShrink: 0,
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                  id={`app-actions-${app.id}`}
                >
                  <MatchBadge score={app.match_score} />
                  {job?.id && (
                    <Link to={`/seeker/jobs/${job.id}`} className="btn btn-secondary btn-sm">
                      View Job <ArrowRight size={14} />
                    </Link>
                  )}
                </div>

                <style>{`
                  @media (min-width: 640px) {
                    #app-actions-${app.id} {
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
