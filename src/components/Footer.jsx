import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="hm-footer">
      <div className="app-container">
        <div className="hm-footer-inner">
          <div>
            <div className="hm-brand-name" style={{ fontSize: '18px' }}>
              HireMatch<span className="hm-brand-dot">.</span>
            </div>
            <p className="body-sm text-muted" style={{ marginTop: '4px' }}>
              Smarter CV screening and job matching.
            </p>
          </div>
          <div>
            <p className="body-sm text-muted">
              &copy; {currentYear} HireMatch. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
