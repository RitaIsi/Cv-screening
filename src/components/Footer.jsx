import React from 'react';

export default function Footer() {
  return (
    <footer className="hm-footer">
      <div className="app-container">
        <div className="hm-footer-inner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '700' }}>
                HireMatch<span style={{ color: 'var(--color-primary)' }}>.</span>
              </span>
            </div>
            <p className="body-sm text-muted" style={{ marginTop: '4px' }}>
              AI-Based CV Screening and Job Recommendation Thesis System
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="body-sm text-muted">
              Built with React, Supabase &amp; Clean Architecture
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
