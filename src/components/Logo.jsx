import React from 'react';

export default function Logo({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true"><span className="brand-line" /><i className="dot dot-teal" /><i className="dot dot-amber" /></span>
      {!compact && <span className="brand-word">زاد</span>}
    </div>
  );
}
