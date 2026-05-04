import React from 'react';

export const ConfidenceBar = ({ label, value, threshold }) => {
  const v = value ?? 0;
  const percentage = Math.round(v * 100);
  const isGood = v >= threshold;

  return (
    <div className="rounded-sm border border-pm-ink/10 bg-pm-wash/40 p-3 dark:border-white/10 dark:bg-pm-void/50">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wider text-pm-muted">{label}</span>
        <span className={`font-semibold ${isGood ? 'text-pm-accent-alt' : 'text-pm-accent'}`}>{percentage}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-sm border border-pm-ink/10 bg-pm-ink/10 dark:border-white/10 dark:bg-white/10">
        <div
          className={`h-2.5 rounded-sm transition-all duration-300 ${isGood ? 'bg-pm-accent-alt' : 'bg-pm-accent'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
