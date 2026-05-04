import React from 'react';

export const AnalysisCard = ({ label, value, icon, good, expected, inverse: _inverse }) => (
  <div
    className={`rounded-sm border-2 p-4 ${
      good
        ? 'border-pm-accent-alt/50 bg-pm-accent-alt/10 dark:border-pm-accent-alt/40 dark:bg-pm-accent-alt/10'
        : 'border-pm-accent/40 bg-pm-accent/10 dark:border-pm-accent/50 dark:bg-pm-accent/15'
    }`}
  >
    <div className="mb-2 flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      {good ? (
        <svg className="h-5 w-5 shrink-0 text-pm-accent-alt" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-5 w-5 shrink-0 text-pm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </div>
    <p
      className={`text-lg font-bold capitalize ${
        good ? 'text-pm-ink dark:text-pm-accent-alt' : 'text-pm-ink dark:text-pm-ink-soft'
      }`}
    >
      {value}
    </p>
    <p className="text-xs text-pm-muted">{label}</p>
    {expected !== undefined && (
      <p className="mt-1 text-xs text-pm-muted">Expected: {expected}</p>
    )}
  </div>
);
