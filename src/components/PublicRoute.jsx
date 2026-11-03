import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicRoute({ children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="loading-spinner"></div>
        <p className="body-md text-muted">Checking authentication...</p>
      </div>
    );
  }

  if (user) {
    const from = location.state?.from?.pathname;
    if (from) {
      return <Navigate to={from} replace />;
    }
    const isRecruiter = role === 'recruiter' || user?.user_metadata?.role === 'recruiter';
    if (isRecruiter) {
      return <Navigate to="/recruiter/dashboard" replace />;
    }
    return <Navigate to="/seeker/jobs" replace />;
  }

  return children;
}
