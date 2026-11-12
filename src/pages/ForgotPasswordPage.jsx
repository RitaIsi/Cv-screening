import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) {
        const isRateLimit =
          error.status === 429 ||
          /rate\s*limit|too\s*many\s*requests|over_email_send_rate_limit|for\s*security\s*purposes/i.test(
            error.message || ''
          ) ||
          /over_email_send_rate_limit/i.test(error.code || '');

        if (isRateLimit) {
          setErrorMsg('Too many requests. Please wait a few minutes and try again.');
          return;
        }
      }

      setSuccessMsg(
        "If an account exists for that email, we've sent a reset link. Check your inbox and spam folder."
      );
    } catch (err) {
      const isRateLimit =
        err?.status === 429 ||
        /rate\s*limit|too\s*many\s*requests|over_email_send_rate_limit|for\s*security\s*purposes/i.test(
          err?.message || ''
        );

      if (isRateLimit) {
        setErrorMsg('Too many requests. Please wait a few minutes and try again.');
      } else {
        setSuccessMsg(
          "If an account exists for that email, we've sent a reset link. Check your inbox and spam folder."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '440px', paddingTop: 'var(--space-lg)' }}>
      <div className="hm-card" style={{ padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="headline-md" style={{ fontSize: '28px' }}>
            Forgot Password
          </h1>
          <p className="body-sm text-muted" style={{ marginTop: '6px' }}>
            Enter your email address and we'll send you a reset link
          </p>
        </div>

        {errorMsg && (
          <div className="alert-box error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box success" role="status">
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={`form-input ${errorMsg ? 'is-error' : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link to="/login" className="btn-link body-sm">
            Back to Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

