import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ConfigNoticeBanner from './components/ConfigNoticeBanner';
import ProtectedRoute from './components/ProtectedRoute';

import PublicRoute from './components/PublicRoute';

// Public Pages
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Seeker Pages
import SeekerProfilePage from './pages/seeker/SeekerProfilePage';
import RecommendedJobsPage from './pages/seeker/RecommendedJobsPage';
import JobDetailsPage from './pages/seeker/JobDetailsPage';
import SeekerApplicationsPage from './pages/seeker/SeekerApplicationsPage';

// Recruiter Pages
import RecruiterDashboardPage from './pages/recruiter/RecruiterDashboardPage';
import JobFormPage from './pages/recruiter/JobFormPage';
import JobApplicantsPage from './pages/recruiter/JobApplicantsPage';

export default function App() {
  return (
    <div className="page-wrapper">
      <ConfigNoticeBanner />
      <Navbar />

      <main className="main-content">
        <Routes>
          {/* Public / Entry Routes */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <SignUpPage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Job Seeker Protected Routes */}
          <Route
            path="/seeker/profile"
            element={
              <ProtectedRoute allowedRoles={['seeker']}>
                <SeekerProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seeker/jobs"
            element={
              <ProtectedRoute allowedRoles={['seeker']}>
                <RecommendedJobsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seeker/jobs/:id"
            element={
              <ProtectedRoute allowedRoles={['seeker']}>
                <JobDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seeker/applications"
            element={
              <ProtectedRoute allowedRoles={['seeker']}>
                <SeekerApplicationsPage />
              </ProtectedRoute>
            }
          />

          {/* Recruiter Protected Routes */}
          <Route
            path="/recruiter/dashboard"
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <RecruiterDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/jobs/new"
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <JobFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/jobs/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <JobFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/jobs/:id/applicants"
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <JobApplicantsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
