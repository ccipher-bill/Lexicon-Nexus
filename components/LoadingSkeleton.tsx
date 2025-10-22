/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const LoadingSkeleton: React.FC = () => {
  return (
    <div aria-label="Loading content..." role="progressbar" className="skeleton-container">
      <div className="skeleton-bar"></div>
      <div className="skeleton-bar"></div>
      <div className="skeleton-bar"></div>
      <div className="skeleton-bar"></div>
      <div className="skeleton-bar"></div>
    </div>
  );
};

export default LoadingSkeleton;
