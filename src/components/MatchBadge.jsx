import React from 'react';

export default function MatchBadge({ score = 0, size = 'md' }) {
  const isHigh = score >= 75;
  const isMedium = score >= 50 && score < 75;

  const getContainerStyle = () => {
    if (size === 'sm') {
      return {
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '4px',
        backgroundColor: isHigh ? '#FFF5F2' : 'var(--color-neutral)',
        border: `1px solid ${isHigh ? '#FED7CC' : 'var(--color-border)'}`,
      };
    }
    return {
      padding: '8px 14px',
      borderRadius: 'var(--radius-md)',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '70px',
      backgroundColor: isHigh ? '#FFF5F2' : 'var(--color-surface)',
      border: `1px solid ${isHigh ? '#FED7CC' : 'var(--color-border)'}`,
    };
  };

  const getValueStyle = () => {
    if (size === 'sm') {
      return {
        fontFamily: 'var(--font-display)',
        fontSize: '15px',
        fontWeight: '700',
        color: isHigh ? 'var(--color-primary)' : 'var(--color-secondary)',
      };
    }
    return {
      fontFamily: 'var(--font-display)',
      fontSize: '28px',
      fontWeight: '700',
      lineHeight: '1',
      color: isHigh ? 'var(--color-primary)' : 'var(--color-secondary)',
    };
  };

  const getLabelStyle = () => {
    return {
      fontFamily: 'var(--font-body)',
      fontSize: size === 'sm' ? '11px' : '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      color: isHigh ? 'var(--color-primary)' : 'var(--color-muted)',
      marginTop: size === 'sm' ? 0 : '4px',
    };
  };

  return (
    <div style={getContainerStyle()} title={`Match Score: ${score}% based on skills and experience`}>
      <span style={getValueStyle()}>{score}%</span>
      <span style={getLabelStyle()}>Match</span>
    </div>
  );
}
