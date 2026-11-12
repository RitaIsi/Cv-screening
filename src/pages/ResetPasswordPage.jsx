import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const isCompletedRef = useRef(false);

  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let fallbackTimer = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || isCompletedRef.current) return;
      if (event === 'PASSWORD_RECOVERY' || session?.user) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || isCompletedRef.current) return;
      if (session?.user) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      } else {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const hasRecoveryParams =
          hash.includes('type=recovery') ||
          hash.includes('access_token=') ||
          search.includes('code=') ||
          search.includes('type=recovery');

        if (hasRecoveryParams && !hash.includes('error=') && !search.includes('error=')) {
          fallbackTimer = setTimeout(() => {
            if (mounted && !isCompletedRef.current) {
              setCheckingSession(false);
            }
          }, 1500);
        } else {
          setCheckingSession(false);
        }
      }
    });

    return () => {
      mounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password || password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message || 'Could not update password. Please try again.');
        return;
      }

      isCompletedRef.current = true;
      await signOut();
      navigate('/login', {
        replace: true,
        state: {
          successMsg: 'Password updated. Please log in with your new password.',
        },
      });
    } catch (err) {
      setErrorMsg(err?.message || 'Could not update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="loading-spinner"></div>
        <p className="body-md text-muted">Verifying reset link...</p>
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="app-container" style={{ maxWidth: '440px', paddingTop: 'var(--space-lg)' }}>
        <div className="hm-card" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h1 className="headline-md" style={{ fontSize: '28px', marginBottom: '12px' }}>
            Reset Password
          </h1>
          <div className="alert-box error" role="alert" style={{ textAlign: 'left', marginTop: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>This reset link is invalid or has expired.</span>
          </div>
          <div style={{ marginTop: '20px' }}>
            <Link to="/forgot-password" className="btn btn-primary" style={{ width: '100%' }}>
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: '440px', paddingTop: 'var(--space-lg)' }}>
      <div className="hm-card" style={{ padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="headline-md" style={{ fontSize: '28px' }}>
            Set New Password
          </h1>
          <p className="body-sm text-muted" style={{ marginTop: '6px' }}>
            Choose a strong password of at least 8 characters
          </p>
        </div>

        {errorMsg && (
          <div className="alert-box error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              className={`form-input ${errorMsg ? 'is-error' : ''}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="At least 8 characters"
              minLength={8}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              className={`form-input ${errorMsg ? 'is-error' : ''}`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Re-enter new password"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {isSubmitting ? 'Updating password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

