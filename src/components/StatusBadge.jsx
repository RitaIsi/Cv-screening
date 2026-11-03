import React from 'react';

export default function StatusBadge({ status = 'pending' }) {
  const normStatus = (status || 'pending').toLowerCase();

  let chipClass = 'hm-chip-secondary';
  let label = 'Under Review';

  if (normStatus === 'shortlisted') {
    chipClass = 'hm-chip-success';
    label = 'Shortlisted';
  } else if (normStatus === 'rejected') {
    chipClass = 'hm-chip-error';
    label = 'Not Selected';
  } else if (normStatus === 'pending') {
    chipClass = 'hm-chip';
    label = 'Pending Review';
  }

  return (
    <span className={`hm-chip ${chipClass}`} style={{ textTransform: 'capitalize' }}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor:
            normStatus === 'shortlisted'
              ? 'var(--color-success)'
              : normStatus === 'rejected'
              ? 'var(--color-error)'
              : 'var(--color-muted)',
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}
