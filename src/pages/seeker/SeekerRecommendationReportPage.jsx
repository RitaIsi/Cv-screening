import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllJobs } from '../../services/jobService';
import {
  buildRecommendationReportData,
  exportPdf,
  exportExcel,
  exportCsv,
} from '../../services/reportExport';
import {
  ArrowLeft,
  FileDown,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Upload,
  GraduationCap,
  Clock,
  Briefcase,
} from 'lucide-react';

export default function SeekerRecommendationReportPage() {
  const { profile } = useAuth();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null);
  const [exportError, setExportError] = useState('');

  const hasAnalyzedCv = Boolean(
    profile?.cv_analyzed_at ||
      profile?.cv_summary ||
      (Array.isArray(profile?.cv_embedding) && profile.cv_embedding.length > 0)
  );

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        setErrorMsg('');
        const allJobs = await getAllJobs();
        const built = buildRecommendationReportData({
          seekerProfile: profile || {},
          jobs: allJobs,
          generatedAt: new Date(),
        });
        setReportData(built);
      } catch (err) {
        console.error('Error generating recommendation report:', err);
        setErrorMsg('Failed to load job recommendation report data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [profile]);

  const handleExport = async (format) => {
    if (!reportData || exportingFormat) return;
    setExportError('');
    setExportingFormat(format);
    try {
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
        <p className="body-md text-muted">Generating Job Recommendation Report...</p>
      </div>
    );
  }

  // If the seeker has no CV analyzed yet, show a message asking them to upload a CV on their Profile page
  if (!hasAnalyzedCv) {
    return (
      <div className="app-container" style={{ paddingTop: 'var(--space-md)' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link to="/seeker/jobs" className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
            <ArrowLeft size={15} /> Back
          </Link>
        </div>

        <div className="empty-state">
          <Upload className="empty-state-icon" />
          <h1 className="headline-sm" style={{ fontSize: '24px' }}>
            CV Analysis Required for Recommendation Report
          </h1>
          <p className="body-sm text-muted" style={{ maxWidth: '460px' }}>
            You don&apos;t have an analyzed CV on your profile yet. Please upload a text-based PDF or DOCX CV on your Profile page so we can generate your personalized Job Recommendation Report.
          </p>
          <Link to="/seeker/profile" className="btn btn-primary" style={{ marginTop: '12px' }}>
            <Upload size={16} /> Go to Profile &amp; Upload CV
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
          <span>{errorMsg || 'Unable to generate recommendation report.'}</span>
        </div>
        <Link to="/seeker/jobs" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Recommended Jobs
        </Link>
      </div>
    );
  }

  const { seeker, recommendedJobs, mostMissingSkills } = reportData;

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
        <Link to="/seeker/jobs" className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
          <ArrowLeft size={15} /> Back
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={Boolean(exportingFormat) || recommendedJobs.length === 0}
            className="btn btn-primary btn-sm"
          >
            <FileDown size={14} />
            {exportingFormat === 'pdf' ? 'Creating PDF...' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={Boolean(exportingFormat) || recommendedJobs.length === 0}
            className="btn btn-secondary btn-sm"
          >
            <FileSpreadsheet size={14} />
            {exportingFormat === 'excel' ? 'Creating Excel...' : 'Download Excel'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={Boolean(exportingFormat) || recommendedJobs.length === 0}
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

      {/* Report Header & Seeker Profile Card */}
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
              Job Seeker Report
            </span>
            <h1 className="headline-md" style={{ fontSize: '32px' }}>
              {reportData.title}
            </h1>
            <p className="body-md" style={{ marginTop: '4px', fontWeight: 500 }}>
              {seeker.fullName}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="label-sm text-muted" style={{ display: 'block' }}>
              Generated
            </span>
            <span className="label-md">{reportData.generatedAt}</span>
          </div>
        </div>

        {/* Seeker Details */}
        <div
          style={{
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <span className="label-sm text-muted">Candidate Name</span>
            <p className="label-lg" style={{ marginTop: '2px' }}>
              {seeker.fullName}
            </p>
          </div>
          <div>
            <span className="label-sm text-muted">Education</span>
            <p className="body-sm" style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <GraduationCap size={15} /> {seeker.education}
            </p>
          </div>
          <div>
            <span className="label-sm text-muted">Years of Experience</span>
            <p className="body-sm" style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} /> {seeker.experienceYears} {seeker.experienceYears === 1 ? 'year' : 'years'}
            </p>
          </div>
        </div>

        {/* Seeker Skills */}
        <div style={{ marginTop: '16px' }}>
          <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '6px' }}>
            Profile Skills
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {seeker.skills.length > 0 ? (
              seeker.skills.map((skill) => (
                <span key={skill} className="hm-chip">
                  {skill}
                </span>
              ))
            ) : (
              <span className="body-sm text-muted">No skills listed on profile</span>
            )}
          </div>
        </div>

        {/* AI CV Summary */}
        {seeker.cvSummary && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: 'var(--color-neutral)',
              border: '1px solid var(--color-border)',
              borderLeft: '3px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span
              className="label-sm text-muted"
              style={{ display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              AI CV Summary
            </span>
            <p className="body-sm">{seeker.cvSummary}</p>
          </div>
        )}

        {/* Method Note */}
        <div
          style={{
            marginTop: '16px',
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

      {/* Top 10 Ranked Jobs Table */}
      {recommendedJobs.length === 0 ? (
        <div className="empty-state">
          <Briefcase className="empty-state-icon" />
          <h2 className="label-lg" style={{ fontSize: '18px' }}>
            No job postings available to rank
          </h2>
          <p className="body-sm text-muted" style={{ maxWidth: '420px' }}>
            As soon as active jobs are posted, your top 10 recommendations will appear in this report.
          </p>
        </div>
      ) : (
        <>
          <div className="hm-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="label-lg" style={{ fontSize: '18px' }}>
                Top {recommendedJobs.length} Recommended Jobs
              </h2>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Total Score</th>
                    <th>Component Scores (0–100)</th>
                    <th>Matched Skills</th>
                    <th>Skills to Improve</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendedJobs.map((j) => (
                    <tr key={j.id || j.rank}>
                      <td style={{ fontWeight: 700 }}>#{j.rank}</td>
                      <td style={{ fontWeight: 600 }}>{j.title}</td>
                      <td>{j.company}</td>
                      <td>{j.location}</td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: j.totalScore >= 75 ? 'var(--color-primary)' : 'var(--color-secondary)' }}>
                          {j.totalScore}%
                        </div>
                        <span
                          className={`hm-chip ${
                            j.totalScore >= 75
                              ? 'hm-chip-accent'
                              : j.totalScore >= 50
                              ? 'hm-chip-secondary'
                              : ''
                          }`}
                          style={{ fontSize: '11px', padding: '2px 8px', marginTop: '4px' }}
                        >
                          {j.matchLabel}
                        </span>
                      </td>
                      <td>
                        <div className="body-sm" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>
                            <strong>Semantic:</strong>{' '}
                            {j.usedFallback || j.semanticScore === null
                              ? 'N/A (Fallback)'
                              : `${j.semanticScore}%`}
                          </span>
                          <span>
                            <strong>Skills:</strong> {j.skillsScore}%
                          </span>
                          <span>
                            <strong>Experience:</strong> {j.experienceScore}%
                          </span>
                        </div>
                      </td>
                      <td>
                        {j.matchedSkills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {j.matchedSkills.map((s) => (
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
                        {j.missingSkills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {j.missingSkills.map((s) => (
                              <span key={s} className="hm-chip" style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--color-muted)' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="body-sm text-muted">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Closing Section: Skills Missing Most Often Across Top Jobs */}
          <div className="hm-card">
            <h2 className="label-lg" style={{ fontSize: '18px', marginBottom: '6px' }}>
              Skills Missing Most Often Across Top Jobs
            </h2>
            <p className="body-sm text-muted" style={{ marginBottom: '14px' }}>
              Focusing on these frequently requested skills can raise your match score across your top job recommendations.
            </p>
            {mostMissingSkills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {mostMissingSkills.map((item) => (
                  <span key={item.skill} className="hm-chip hm-chip-secondary">
                    <strong>{item.skill}</strong>
                    <span className="text-muted">
                      ({item.count} {item.count === 1 ? 'job' : 'jobs'})
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="body-sm text-muted">
                None — your profile covers all required skills across the top recommended jobs!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

