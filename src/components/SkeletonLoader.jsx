import React from 'react';

/**
 * SkeletonLoader component provides a high-fidelity shimmer effect
 * to maintain layout stability during asynchronous DOM injections.
 */
export const SkeletonLoader = () => (
  <div className="skeleton-card article-card">
    <div className="skeleton-media shimmer"></div>
    <div className="article-content">
      <div className="skeleton-meta">
        <div className="skeleton-tag shimmer"></div>
        <div className="skeleton-date shimmer"></div>
      </div>
      <div className="skeleton-title shimmer"></div>
      <div className="skeleton-title shimmer" style={{ width: '60%' }}></div>
      <div className="skeleton-text shimmer"></div>
      <div className="skeleton-text shimmer" style={{ width: '85%' }}></div>
      <div className="skeleton-actions">
         <div className="skeleton-btn shimmer"></div>
      </div>
    </div>
  </div>
);
