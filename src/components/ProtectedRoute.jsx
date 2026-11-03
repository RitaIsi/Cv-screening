import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to the appropriate home base for their role
    if (role === 'seeker') {
      return <Navigate to="/seeker/jobs" replace />;
    } else if (role === 'recruiter') {
      return <Navigate to="/recruiter/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
