import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, User, FileText, PlusCircle, LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, profile, role, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="hm-nav">
      <div className="app-container">
        <div className="hm-nav-inner">
          {/* Brand */}
          <Link to="/" className="hm-brand" onClick={closeMenu}>
            <span className="hm-brand-name">
              HireMatch<span className="hm-brand-dot">.</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hm-nav-links" style={{ display: 'none' }} id="desktop-nav">
            {/* Conditional Links by Auth Role */}
            {!user ? (
              <Link to="/login" className="hm-nav-link">
                Log In
              </Link>
            ) : role === 'seeker' ? (
              <>
                <NavLink
                  to="/seeker/jobs"
                  className={({ isActive }) => `hm-nav-link ${isActive ? 'active' : ''}`}
                >
                  Recommended Jobs
                </NavLink>
                <NavLink
                  to="/seeker/applications"
                  className={({ isActive }) => `hm-nav-link ${isActive ? 'active' : ''}`}
                >
                  My Applications
                </NavLink>
                <NavLink
                  to="/seeker/profile"
                  className={({ isActive }) => `hm-nav-link ${isActive ? 'active' : ''}`}
                >
                  Profile
                </NavLink>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
                  <span className="hm-chip hm-chip-accent" style={{ fontSize: '11px' }}>
                    Seeker
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="btn btn-secondary btn-sm"
                    title="Log Out"
                  >
                    <LogOut size={14} />
                    Log Out
                  </button>
                </div>
              </>
            ) : role === 'recruiter' ? (
              <>
                <NavLink
                  to="/recruiter/dashboard"
                  className={({ isActive }) => `hm-nav-link ${isActive ? 'active' : ''}`}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/recruiter/jobs/new"
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <PlusCircle size={14} />
                  Post a Job
                </NavLink>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
                  <span className="hm-chip" style={{ fontSize: '11px' }}>
                    {profile?.company_name || 'Recruiter'}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="btn btn-secondary btn-sm"
                    title="Log Out"
                  >
                    <LogOut size={14} />
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <button onClick={handleSignOut} className="btn btn-secondary btn-sm">
                Log Out
              </button>
            )}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', padding: '8px' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            id="mobile-nav-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: '16px 0 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {!user ? (
              <Link to="/login" className="hm-nav-link" onClick={closeMenu}>
                Log In
              </Link>
            ) : role === 'seeker' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                  <span className="label-md">Logged in as {profile?.full_name || 'Seeker'}</span>
                  <span className="hm-chip hm-chip-accent" style={{ fontSize: '11px' }}>
                    Seeker
                  </span>
                </div>
                <Link to="/seeker/jobs" className="hm-nav-link" onClick={closeMenu}>
                  Recommended Jobs
                </Link>
                <Link to="/seeker/applications" className="hm-nav-link" onClick={closeMenu}>
                  My Applications
                </Link>
                <Link to="/seeker/profile" className="hm-nav-link" onClick={closeMenu}>
                  Profile
                </Link>
                <button onClick={handleSignOut} className="btn btn-secondary" style={{ marginTop: '8px' }}>
                  <LogOut size={16} /> Log Out
                </button>
              </>
            ) : role === 'recruiter' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                  <span className="label-md">Logged in as {profile?.company_name || profile?.full_name || 'Recruiter'}</span>
                  <span className="hm-chip" style={{ fontSize: '11px' }}>
                    Recruiter
                  </span>
                </div>
                <Link to="/recruiter/dashboard" className="hm-nav-link" onClick={closeMenu}>
                  Dashboard
                </Link>
                <Link to="/recruiter/jobs/new" className="btn btn-primary" onClick={closeMenu}>
                  <PlusCircle size={16} /> Post a Job
                </Link>
                <button onClick={handleSignOut} className="btn btn-secondary" style={{ marginTop: '8px' }}>
                  <LogOut size={16} /> Log Out
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          #desktop-nav {
            display: flex !important;
          }
          #mobile-nav-toggle {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
