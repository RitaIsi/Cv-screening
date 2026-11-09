import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SkillChipInput from '../../components/SkillChipInput';
import { uploadCV, validateCVFile, getCVSignedUrl } from '../../services/storageService';
import { extractCVText } from '../../services/cvExtractor';
import { analyzeCv } from '../../services/aiService';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function SeekerProfilePage() {
  const { user, profile, updateProfile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [education, setEducation] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [skills, setSkills] = useState([]);
  const [cvPath, setCvPath] = useState(null);

  // AI-analyzed CV fields
  const [cvText, setCvText] = useState('');
  const [cvSummary, setCvSummary] = useState('');
  const [cvEmbedding, setCvEmbedding] = useState(null);
  const [cvAnalyzedAt, setCvAnalyzedAt] = useState(null);

  const [uploadingCV, setUploadingCV] = useState(false);
  const [analyzingCV, setAnalyzingCV] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cvUrl, setCvUrl] = useState(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEducation(profile.education || '');
      setExperienceYears(profile.experience_years || 0);
      setSkills(Array.isArray(profile.skills) ? profile.skills : []);
      setCvPath(profile.cv_path || null);
      setCvText(profile.cv_text || '');
      setCvSummary(profile.cv_summary || '');
      setCvEmbedding(profile.cv_embedding || null);
      setCvAnalyzedAt(profile.cv_analyzed_at || null);
    }
  }, [profile]);

  useEffect(() => {
    if (cvPath) {
      getCVSignedUrl(cvPath)
        .then((url) => setCvUrl(url))
        .catch((err) => console.log('CV URL fetch note:', err));
    } else {
      setCvUrl(null);
    }
  }, [cvPath]);

  const handleCVChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');
    setAiSuggestions(null);

    // 1. Validate file format and size
    try {
      validateCVFile(file);
    } catch (valErr) {
      setErrorMsg(valErr.message || 'Invalid file format.');
      e.target.value = '';
      return;
    }

    // 2. Extract plain text in the browser (pdfjs-dist for PDF, mammoth for DOCX)
    let extractedText = '';
    try {
      extractedText = await extractCVText(file);
    } catch (parseErr) {
      console.error('CV text extraction error:', parseErr);
      setErrorMsg(parseErr.message || 'Could not parse text from this document.');
      e.target.value = '';
      return;
    }

    // 3. Upload file to Supabase Storage
    let uploadedPath = null;
    try {
      setUploadingCV(true);
      uploadedPath = await uploadCV(user.id, file);
      setCvPath(uploadedPath);

      // Save cv_path immediately so the document is linked
      await updateProfile({ cv_path: uploadedPath });
      setSuccessMsg(`CV "${file.name}" uploaded successfully!`);
    } catch (uploadErr) {
      console.error('CV upload error:', uploadErr);
      setErrorMsg(uploadErr.message || 'Failed to upload CV to storage.');
      setUploadingCV(false);
      e.target.value = '';
      return;
    } finally {
      setUploadingCV(false);
      e.target.value = '';
    }

    // 4. Call AI Edge Function analyze_cv
    try {
      setAnalyzingCV(true);
      const aiResult = await analyzeCv(extractedText);

      if (aiResult?.analysis) {
        const analysis = aiResult.analysis;

        // Pre-fill fields with AI suggestions (without silently persisting)
        if (Array.isArray(analysis.skills) && analysis.skills.length > 0) {
          // Merge newly extracted skills with existing skills without duplicates
          const merged = Array.from(new Set([...skills, ...analysis.skills]));
          setSkills(merged);
        }

        if (analysis.education && !education) {
          setEducation(analysis.education);
        } else if (analysis.education) {
          setEducation(analysis.education);
        }

        if (typeof analysis.experience_years === 'number') {
          setExperienceYears(analysis.experience_years);
        }

        setCvText(extractedText);
        setCvSummary(analysis.summary || '');
        setCvEmbedding(aiResult.embedding || null);
        setCvAnalyzedAt(new Date().toISOString());

        setAiSuggestions(analysis);
        setSuccessMsg(
          `CV "${file.name}" uploaded and analyzed! Suggested qualifications have been pre-filled below. Review and adjust them, then click "Save Profile Changes".`
        );
      }
    } catch (aiErr) {
      console.warn('AI CV analysis note:', aiErr);
      // CV upload still succeeds even if AI service encounters timeout or rate limit
      setCvText(extractedText);
      if (
        aiErr?.code === 'AI_TIMEOUT' ||
        aiErr?.message?.includes('too long') ||
        aiErr?.message?.includes('timed out') ||
        aiErr?.status === 546 ||
        aiErr?.status === 504
      ) {
        setErrorMsg('AI screening took too long. You can fill in your details manually.');
      } else if (aiErr?.code === 'RATE_LIMIT_EXCEEDED') {
        setErrorMsg('The AI is busy, please try again in a minute. Your CV was uploaded, and you can fill in your qualifications manually.');
      } else {
        setErrorMsg(
          `CV uploaded successfully! AI screening was unavailable (${aiErr.message || 'Service offline'}). You can edit your qualifications manually below.`
        );
      }
    } finally {
      setAnalyzingCV(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        education: education.trim(),
        experience_years: parseInt(experienceYears, 10) || 0,
        skills,
        cv_path: cvPath,
        cv_text: cvText || null,
        cv_summary: cvSummary || null,
        cv_embedding: cvEmbedding || null,
        cv_analyzed_at: cvAnalyzedAt || null,
      });

      setSuccessMsg('Profile updated successfully!');
      setAiSuggestions(null); // Clear suggestion banner after confirmation
      await refreshProfile();
    } catch (err) {
      console.error('Profile update error:', err);
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '760px', paddingTop: 'var(--space-md)' }}>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <h1 className="headline-md">Candidate Profile</h1>
        <p className="body-sm text-muted" style={{ marginTop: '4px' }}>
          Your profile details, CV text, and skills are analyzed by HireMatch to score and rank job opportunities.
        </p>
      </div>

      {successMsg && (
        <div className="alert-box success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box error" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {analyzingCV && (
        <div
          className="alert-box"
          style={{
            backgroundColor: '#EFF8FF',
            borderColor: '#B2DDFF',
            color: '#175CD3',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <span>Analyzing your CV... Extracting skills, experience, and educational background.</span>
        </div>
      )}

      {aiSuggestions && (
        <div
          className="alert-box"
          style={{
            backgroundColor: '#FFF5F2',
            borderColor: '#FED7CC',
            color: 'var(--color-secondary)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Sparkles size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', lineHeight: '20px' }}>
            <strong>AI Suggestions Pre-filled:</strong> We evaluated your CV and suggested skills, education, and years of experience below. Please review and adjust them before clicking <em>Save Profile Changes</em>.
            {aiSuggestions.summary && (
              <p className="body-sm text-muted" style={{ marginTop: '6px', fontStyle: 'italic' }}>
                "{aiSuggestions.summary}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* CV Upload Card */}
      <div className="hm-card" style={{ marginBottom: '24px' }}>
        <h2 className="label-lg" style={{ fontSize: '18px', marginBottom: '8px' }}>
          Curriculum Vitae (CV)
        </h2>
        <p className="body-sm text-muted" style={{ marginBottom: '16px' }}>
          Upload your resume in PDF or Word format (max 5MB). Required before applying to any position.
        </p>

        {cvPath ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--color-neutral)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color="var(--color-primary)" />
              <div>
                <p className="label-md" style={{ wordBreak: 'break-all' }}>
                  {cvPath.split('/').pop()?.replace(/^\d+_/, '') || 'Your Resume Document'}
                </p>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span className="hm-chip hm-chip-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    CV Uploaded
                  </span>
                  {cvAnalyzedAt && (
                    <span className="hm-chip hm-chip-accent" style={{ fontSize: '11px', padding: '2px 8px' }}>
                      AI Screened
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {cvUrl && (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '4px' }}
                >
                  <ExternalLink size={14} /> View CV
                </a>
              )}
              <label
                className="btn btn-secondary btn-sm"
                style={{ cursor: uploadingCV || analyzingCV ? 'not-allowed' : 'pointer' }}
              >
                <Upload size={14} /> {uploadingCV ? 'Uploading...' : analyzingCV ? 'Analyzing...' : 'Replace CV'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleCVChange}
                  disabled={uploadingCV || analyzingCV}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '24px',
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              backgroundColor: 'var(--color-neutral)',
            }}
          >
            <FileText size={36} color="var(--color-muted)" style={{ margin: '0 auto 8px' }} />
            <p className="label-md">No CV document uploaded yet</p>
            <p className="body-sm text-muted" style={{ marginTop: '4px', marginBottom: '16px' }}>
              Upload your resume (text-based PDF or DOCX, max 5MB) to extract qualifications and get matched with relevant jobs.
            </p>
            <label
              className="btn btn-primary"
              style={{ cursor: uploadingCV || analyzingCV ? 'not-allowed' : 'pointer' }}
            >
              <Upload size={16} />
              {uploadingCV ? 'Uploading Document...' : analyzingCV ? 'Analyzing CV with AI...' : 'Upload Resume'}
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleCVChange}
                disabled={uploadingCV || analyzingCV}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Main Profile Form */}
      <div className="hm-card">
        <h2 className="label-lg" style={{ fontSize: '18px', marginBottom: '16px' }}>
          Personal &amp; Professional Qualifications
        </h2>

        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="education">
                Highest Degree / Education {aiSuggestions?.education && <span style={{ color: 'var(--color-primary)', fontSize: '11px' }}>(AI Suggested)</span>}
              </label>
              <input
                id="education"
                type="text"
                className="form-input"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. B.Sc. in Computer Science"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="experienceYears">
                Years of Relevant Experience {aiSuggestions?.experience_years !== undefined && <span style={{ color: 'var(--color-primary)', fontSize: '11px' }}>(AI Suggested)</span>}
              </label>
              <input
                id="experienceYears"
                type="number"
                min="0"
                max="50"
                className="form-input"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
          </div>

          {/* Skills Chip Management */}
          <SkillChipInput
            skills={skills}
            onChange={setSkills}
            label={`Key Skills & Competencies ${aiSuggestions?.skills ? '(AI Suggested Skills Added)' : ''}`}
            placeholder="Type skill (e.g. React, Python, PostgreSQL) and hit Enter"
          />
          <p className="form-hint" style={{ marginTop: '-8px', marginBottom: '16px' }}>
            Match scores are heavily calculated against these skills. Add all your key technical and domain competencies.
          </p>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingProfile || uploadingCV || analyzingCV}
            style={{ marginTop: '8px' }}
          >
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
