import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SkillChipInput from '../../components/SkillChipInput';
import { uploadCV, validateCVFile, getCVSignedUrl } from '../../services/storageService';
import { FileText, Upload, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

export default function SeekerProfilePage() {
  const { user, profile, updateProfile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [education, setEducation] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [skills, setSkills] = useState([]);
  const [cvPath, setCvPath] = useState(null);

  const [uploadingCV, setUploadingCV] = useState(false);
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

    try {
      validateCVFile(file);
      setUploadingCV(true);

      const path = await uploadCV(user.id, file);
      setCvPath(path);

      // Immediately save cv_path to profile
      await updateProfile({ cv_path: path });
      setSuccessMsg(`CV "${file.name}" uploaded successfully!`);
    } catch (err) {
      console.error('CV upload error:', err);
      setErrorMsg(err.message || 'Failed to upload CV.');
    } finally {
      setUploadingCV(false);
      e.target.value = ''; // reset file input
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
      });
      setSuccessMsg('Profile updated successfully!');
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
          Your profile details and skills are used by HireMatch to score and rank job opportunities.
        </p>
      </div>

      {successMsg && (
        <div className="alert-box success">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
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
                <span className="hm-chip hm-chip-success" style={{ fontSize: '11px', padding: '2px 8px', marginTop: '4px' }}>
                  CV Uploaded &amp; Ready
                </span>
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
              <label className="btn btn-secondary btn-sm" style={{ cursor: uploadingCV ? 'not-allowed' : 'pointer' }}>
                <Upload size={14} /> Replace CV
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleCVChange}
                  disabled={uploadingCV}
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
              Upload your resume (PDF or DOCX, max 5MB) so hiring managers can review your background.
            </p>
            <label className="btn btn-primary" style={{ cursor: uploadingCV ? 'not-allowed' : 'pointer' }}>
              <Upload size={16} />
              {uploadingCV ? 'Uploading Document...' : 'Upload Resume'}
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleCVChange}
                disabled={uploadingCV}
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
                Highest Degree / Education
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
                Years of Relevant Experience
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
            label="Key Skills & Competencies"
            placeholder="Type skill (e.g. React, Python, PostgreSQL) and hit Enter"
          />
          <p className="form-hint" style={{ marginTop: '-8px', marginBottom: '16px' }}>
            Match scores are heavily calculated against these skills. Add all your key technical and domain competencies.
          </p>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingProfile}
            style={{ marginTop: '8px' }}
          >
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
