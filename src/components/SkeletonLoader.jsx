import React from 'react';

export const SkeletonLoader = () => (
  <div className="article-card skeleton-card">
    <div className="card-overlay shimmer" style={{ opacity: 0.6 }} />
    <div className="card-bottom">
      <div className="card-content">
        <div className="skeleton-meta">
          <div className="skeleton-tag shimmer" />
          <div className="skeleton-date shimmer" />
        </div>
        <div className="skeleton-title shimmer" />
        <div className="skeleton-title shimmer" style={{ width: '70%', marginTop: '10px' }} />
        <div className="skeleton-text shimmer" style={{ marginTop: '14px' }} />
        <div className="skeleton-text shimmer" style={{ width: '85%' }} />
        <div className="skeleton-text shimmer" style={{ width: '60%' }} />
      </div>
      <div className="card-actions" style={{ opacity: 0.3 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: '#333' }} className="shimmer" />
        ))}
      </div>
    </div>
  </div>
);
