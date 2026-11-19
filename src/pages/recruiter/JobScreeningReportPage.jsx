import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getJobById } from '../../services/jobService';
import { getJobApplications } from '../../services/applicationService';
import {
  buildScreeningReportData,
  exportPdf,
  exportExcel,
  exportCsv,
} from '../../services/reportExport';
import StatusBadge from '../../components/StatusBadge';
import {
  ArrowLeft,
  FileDown,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  MapPin,
  Clock,
  Briefcase,
  Users,
} from 'lucide-react';

export default function JobScreeningReportPage() {
  const { id: jobId } = useParams();
  const { user, profile } = useAuth();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        setErrorMsg('');
        setAccessDenied(false);

        const jobData = await getJobById(jobId);
        if (!jobData) {
          setErrorMsg('Job posting not found.');
          return;
        }

        // Enforce that recruiters can only open reports for their own jobs
        if (jobData.recruiter_id && user?.id && jobData.recruiter_id !== user.id) {
          setAccessDenied(true);
          return;
        }

        const apps = await getJobApplications(jobId);
        const built = buildScreeningReportData({
          job: jobData,
          applications: apps,
          recruiterProfile: profile,
          generatedAt: new Date(),
        });
        setReportData(built);
      } catch (err) {
        console.error('Error generating CV screening report:', err);
        setErrorMsg('Failed to load screening report data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadReport();
    }
  }, [jobId, user, profile]);

  const handleExport = async (format) => {
    if (!reportData || exportingFormat) return;
    setExportError('');
    setExportingFormat(format);
    try {
      // Allow React to paint the loading state before synchronous/async generation
      await new Promise((resolve) => setTimeout(resolve, 40));
      if (format === 'pdf') {
        await exportPdf(reportData);
      } else if (format === 'excel') {
        await exportExcel(reportData);
      } else if (format === 'csv') {
        await exportCsv(reportData);
      }
    } catch (err) {
      console.error(`Error exporting ${format}:`, err);
      setExportError(`Could not generate ${format.toUpperCase()} file. Please try again.`);
    } finally {
      setExportingFormat(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="body-md text-muted">Generating CV Screening Report...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="app-container" style={{ paddingTop: 'var(--space-lg)' }}>
        <div className="empty-state">
          <AlertCircle className="empty-state-icon" style={{ color: 'var(--color-error)' }} />
          <h2 className="label-lg" style={{ fontSize: '20px' }}>
            Access Restricted
          </h2>
          <p className="body-sm text-muted" style={{ maxWidth: '420px' }}>
            You can only generate and view CV Screening Reports for job postings created by your account.
          </p>
          <Link to="/recruiter/dashboard" className="btn btn-secondary" style={{ marginTop: '12px' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (errorMsg || !reportData) {
    return (
      <div className="app-container" style={{ paddingTop: 'var(--space-lg)' }}>
        <div className="alert-box error">
          <AlertCircle size={16} />
          <span>{errorMsg || 'Unable to generate report.'}</span>
        </div>
        <Link to={`/recruiter/jobs/${jobId}/applicants`} className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Applicants
        </Link>
      </div>
    );
  }

  const { job, summaryCounts, candidates } = reportData;

  return (
    <div className="app-container report-page" style={{ paddingTop: 'var(--space-md)' }}>
      {/* Top Action Bar: Back + Download Buttons */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <Link
          to={`/recruiter/jobs/${jobId}/applicants`}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <ArrowLeft size={15} /> Back
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={Boolean(exportingFormat) || candidates.length === 0}
            className="btn btn-primary btn-sm"
          >
            <FileDown size={14} />
            {exportingFormat === 'pdf' ? 'Creating PDF...' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={Boolean(exportingFormat) || candidates.length === 0}
            className="btn btn-secondary btn-sm"
          >
            <FileSpreadsheet size={14} />
            {exportingFormat === 'excel' ? 'Creating Excel...' : 'Download Excel'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={Boolean(exportingFormat) || candidates.length === 0}
            className="btn btn-secondary btn-sm"
          >
            <FileText size={14} />
            {exportingFormat === 'csv' ? 'Creating CSV...' : 'Download CSV'}
          </button>
        </div>
      </div>

      {exportError && (
        <div className="alert-box error no-print" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{exportError}</span>
        </div>
      )}

      {/* Report Header & Job Metadata Card */}
      <div className="hm-card" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div>
            <span className="hm-chip hm-chip-accent" style={{ marginBottom: '8px' }}>
              Recruiter Report
            </span>
            <h1 className="headline-md" style={{ fontSize: '32px' }}>
              {reportData.title}
            </h1>
            <p className="body-md" style={{ marginTop: '4px', fontWeight: 500 }}>
              {reportData.companyName}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="label-sm text-muted" style={{ display: 'block' }}>
              Generated
            </span>
            <span className="label-md">{reportData.generatedAt}</span>
          </div>
        </div>

        {/* Job Details */}
        <div
          style={{
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <span className="label-sm text-muted">Job Title</span>
            <p className="label-lg" style={{ marginTop: '2px' }}>
              {job.title}
            </p>
          </div>
          <div>
            <span className="label-sm text-muted">Location &amp; Type</span>
            <p className="body-sm" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> {job.location}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Briefcase size={14} /> {job.jobType}
              </span>
            </p>
          </div>
          <div>
            <span className="label-sm text-muted">Minimum Experience</span>
            <p className="body-sm" style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={14} /> {job.minExperience} {job.minExperience === 1 ? 'year' : 'years'}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '6px' }}>
            Required Skills
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {job.requiredSkills.length > 0 ? (
              job.requiredSkills.map((skill) => (
                <span key={skill} className="hm-chip">
                  {skill}
                </span>
              ))
            ) : (
              <span className="body-sm text-muted">No required skills specified</span>
            )}
          </div>
        </div>

        {/* Method Note */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px 16px',
            backgroundColor: 'var(--color-neutral)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span className="label-sm" style={{ color: 'var(--color-secondary)' }}>
            Method:{' '}
          </span>
          <span className="body-sm text-muted">{reportData.methodNote}</span>
        </div>
      </div>

      {/* Summary Counts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div className="hm-card" style={{ padding: '16px' }}>
          <span className="label-sm text-muted">Total Applicants</span>
          <p className="font-display" style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>
            {summaryCounts.totalApplicants}
          </p>
        </div>
        <div className="hm-card" style={{ padding: '16px' }}>
          <span className="label-sm text-muted">Strong Matches (75–100)</span>
          <p
            className="font-display"
            style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: 'var(--color-primary)' }}
          >
            {summaryCounts.strongMatches}
          </p>
        </div>
        <div className="hm-card" style={{ padding: '16px' }}>
          <span className="label-sm text-muted">Moderate Matches (50–74)</span>
          <p className="font-display" style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>
            {summaryCounts.moderateMatches}
          </p>
        </div>
        <div className="hm-card" style={{ padding: '16px' }}>
          <span className="label-sm text-muted">Low Matches (0–49)</span>
          <p className="font-display text-muted" style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>
            {summaryCounts.lowMatches}
          </p>
        </div>
        <div className="hm-card" style={{ padding: '16px' }}>
          <span className="label-sm text-muted">Shortlisted</span>
          <p
            className="font-display"
            style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: '#067647' }}
          >
            {summaryCounts.shortlisted}
          </p>
        </div>
      </div>

      {/* Ranked Candidates Table */}
      {candidates.length === 0 ? (
        <div className="empty-state">
          <Users className="empty-state-icon" />
          <h2 className="label-lg" style={{ fontSize: '18px' }}>
            No applicants to report yet
          </h2>
          <p className="body-sm text-muted" style={{ maxWidth: '420px' }}>
            Once candidates apply to this job posting, their ranked score breakdown and AI CV summary will appear here.
          </p>
        </div>
      ) : (
        <div className="hm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="label-lg" style={{ fontSize: '18px' }}>
              Ranked Candidates ({candidates.length})
            </h2>
          </div>
          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate</th>
                  <th>Education</th>
                  <th>Experience</th>
                  <th>Total Score</th>
                  <th>Component Scores (0–100)</th>
                  <th>Matched Skills</th>
                  <th>Missing Skills</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <React.Fragment key={c.id || c.rank}>
                    <tr>
                      <td style={{ fontWeight: 700 }}>#{c.rank}</td>
                      <td style={{ fontWeight: 600 }}>{c.candidateName}</td>
                      <td>{c.education}</td>
                      <td>
                        {c.experienceYears} {c.experienceYears === 1 ? 'yr' : 'yrs'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: c.totalScore >= 75 ? 'var(--color-primary)' : 'var(--color-secondary)' }}>
                          {c.totalScore}%
                        </div>
                        <span
                          className={`hm-chip ${
                            c.totalScore >= 75
                              ? 'hm-chip-accent'
                              : c.totalScore >= 50
                              ? 'hm-chip-secondary'
                              : ''
                          }`}
                          style={{ fontSize: '11px', padding: '2px 8px', marginTop: '4px' }}
                        >
                          {c.matchLabel}
                        </span>
                      </td>
                      <td>
                        {!c.hasBreakdown ? (
                          <span className="body-sm text-muted">Breakdown not available</span>
                        ) : (
                          <div className="body-sm" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>
                              <strong>Semantic:</strong>{' '}
                              {c.usedFallback || c.semanticScore === null
                                ? 'N/A (Fallback)'
                                : `${c.semanticScore}%`}
                            </span>
                            <span>
                              <strong>Skills:</strong> {c.skillsScore}%
                            </span>
                            <span>
                              <strong>Experience:</strong> {c.experienceScore}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        {c.matchedSkills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {c.matchedSkills.map((s) => (
                              <span key={s} className="hm-chip hm-chip-accent" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="body-sm text-muted">None</span>
                        )}
                      </td>
                      <td>
                        {c.missingSkills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {c.missingSkills.map((s) => (
                              <span key={s} className="hm-chip" style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--color-muted)' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="body-sm text-muted">None</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                    {/* AI CV Summary row beneath each candidate row */}
                    <tr className="report-summary-subrow">
                      <td colSpan={9}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                          <span
                            className="label-sm text-muted"
                            style={{ textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}
                          >
                            AI CV Summary:
                          </span>
                          <span className="body-sm" style={{ color: c.cvSummary ? 'var(--color-on-surface)' : 'var(--color-muted)' }}>
                            {c.cvSummary || 'No AI CV summary available for this candidate.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

