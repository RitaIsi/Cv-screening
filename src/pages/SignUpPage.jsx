import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, User, Building2 } from 'lucide-react';

export default function SignUpPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'seeker';

  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (role === 'recruiter' && !companyName.trim()) {
      setErrorMsg('Please enter your company name.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please fill in both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        email,
        password,
        full_name: fullName.trim(),
        role,
        company_name: role === 'recruiter' ? companyName.trim() : null,
      });

      // Navigate to onboarding / role home
      if (role === 'recruiter') {
        navigate('/recruiter/dashboard', { replace: true });
      } else {
        navigate('/seeker/profile', { replace: true });
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setErrorMsg(err.message || 'Failed to create account. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '480px', paddingTop: 'var(--space-lg)' }}>
      <div className="hm-card" style={{ padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="headline-md" style={{ fontSize: '28px' }}>
            Create Your Account
          </h1>
          <p className="body-sm text-muted" style={{ marginTop: '6px' }}>
            Select your role to get tailored job matching or candidate screening
          </p>
        </div>

        {errorMsg && (
          <div className="alert-box error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role Choice Selector */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">I am joining as a:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRole('seeker')}
                className={`btn ${role === 'seeker' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                <User size={18} />
                <span>Job Seeker</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('recruiter')}
                className={`btn ${role === 'recruiter' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={18} />
                <span>Recruiter</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
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
              placeholder={role === 'recruiter' ? 'Jane Doe (Hiring Manager)' : 'Alex Rivera'}
              required
            />
          </div>

          {/* Recruiter Company Name */}
          {role === 'recruiter' && (
            <div className="form-group">
              <label className="form-label" htmlFor="companyName">
                Company Name
              </label>
              <input
                id="companyName"
                type="text"
                className="form-input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Innovations Inc."
                required
              />
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span className="text-muted" style={{ fontWeight: 'normal' }}>(min. 6 characters)</span>
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {isSubmitting ? 'Creating Account...' : `Register as ${role === 'seeker' ? 'Job Seeker' : 'Recruiter'}`}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p className="body-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="btn-link">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
