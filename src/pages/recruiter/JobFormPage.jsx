import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createJob, getJobById, updateJob } from '../../services/jobService';
import SkillChipInput from '../../components/SkillChipInput';
import { ArrowLeft, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export default function JobFormPage() {
  const { id: jobId } = useParams();
  const isEditing = Boolean(jobId);

  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(profile?.company_name || '');
  const [location, setLocation] = useState('Remote');
  const [jobType, setJobType] = useState('Full-time');
  const [minExperience, setMinExperience] = useState(2);
  const [requiredSkills, setRequiredSkills] = useState([]);
  const [description, setDescription] = useState('');

  const [loadingInitial, setLoadingInitial] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isEditing) {
      getJobById(jobId)
        .then((data) => {
          if (data) {
            // Verify ownership
            if (data.recruiter_id !== user?.id) {
              setErrorMsg('You do not have permission to edit this job posting.');
              return;
            }
            setTitle(data.title || '');
            setCompany(data.company || '');
            setLocation(data.location || '');
            setJobType(data.job_type || 'Full-time');
            setMinExperience(data.min_experience ?? 0);
            setRequiredSkills(Array.isArray(data.required_skills) ? data.required_skills : []);
            setDescription(data.description || '');
          }
        })
        .catch((err) => {
          console.error('Error fetching job for edit:', err);
          setErrorMsg('Failed to load existing job details.');
        })
        .finally(() => setLoadingInitial(false));
    }
  }, [isEditing, jobId, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please specify a job title.');
      return;
    }

    if (!company.trim()) {
      setErrorMsg('Please specify the company or organization name.');
      return;
    }

    if (!location.trim()) {
      setErrorMsg('Please enter a location or specify "Remote".');
      return;
    }

    if (requiredSkills.length === 0) {
      setErrorMsg('Please add at least one required skill for match scoring.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please provide a job description and responsibilities.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        job_type: jobType,
        min_experience: parseInt(minExperience, 10) || 0,
        required_skills: requiredSkills,
        description: description.trim(),
        recruiter_id: user.id,
      };

      if (isEditing) {
        await updateJob(jobId, payload);
      } else {
        await createJob(payload);
      }

      navigate('/recruiter/dashboard');
    } catch (err) {
      console.error('Error saving job:', err);
      setErrorMsg(err.message || 'Failed to save job posting.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="body-md text-muted">Loading job information...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: '760px', paddingTop: 'var(--space-md)' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/recruiter/dashboard"
          className="btn-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <h1 className="headline-md">
          {isEditing ? 'Edit Job Posting' : 'Create New Job Opening'}
        </h1>
        <p className="body-sm text-muted" style={{ marginTop: '4px' }}>
          Define the role requirements, skills, and experience criteria used by the screening engine.
        </p>
      </div>

      {errorMsg && (
        <div className="alert-box error" style={{ marginBottom: '20px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="hm-card">
        <form onSubmit={handleSubmit}>
          {/* Job Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Job Title *
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Machine Learning Engineer"
              required
            />
          </div>

          {/* Company & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="company">
                Company Name *
              </label>
              <input
                id="company"
                type="text"
                className="form-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Tech"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="location">
                Location *
              </label>
              <input
                id="location"
                type="text"
                className="form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote / New York, NY"
                required
              />
            </div>
          </div>

          {/* Job Type & Min Experience */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="jobType">
                Employment Type
              </label>
              <select
                id="jobType"
                className="form-select"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="minExperience">
                Minimum Years of Experience *
              </label>
              <input
                id="minExperience"
                type="number"
                min="0"
                max="30"
                className="form-input"
                value={minExperience}
                onChange={(e) => setMinExperience(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Required Skills Chip Input */}
          <SkillChipInput
            skills={requiredSkills}
            onChange={setRequiredSkills}
            label="Required Skills & Technologies *"
            placeholder="Type skill (e.g. React, Python) and press Enter"
          />
          <p className="form-hint" style={{ marginTop: '-6px', marginBottom: '16px' }}>
            The AI screening service scores applicant CVs 70% based on matches with these exact skills.
          </p>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Role Description &amp; Responsibilities *
            </label>
            <textarea
              id="description"
              rows={6}
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline the day-to-day responsibilities, mission, and qualification expectations..."
              required
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <Link to="/recruiter/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '140px' }}
            >
              {submitting ? 'Saving...' : (
                <>
                  <Save size={16} /> {isEditing ? 'Save Changes' : 'Publish Job'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
