import React from 'react';

export const ConfidenceCircle = ({ label, value, threshold }) => {
  const percentage = Math.round((value || 0) * 100);
  const isGood = (value || 0) >= threshold;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-3 bg-pm-wash/40 dark:bg-pm-void/60 border border-pm-ink/10 dark:border-white/10 rounded-sm">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-pm-ink/10 dark:text-white/15"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            className={isGood ? 'text-pm-accent-alt' : 'text-pm-accent'}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-lg font-display font-bold ${isGood ? 'text-pm-accent-alt' : 'text-pm-accent'}`}
          >
            {percentage}%
          </span>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-pm-muted text-center max-w-[7rem] leading-tight">
        {label}
      </p>
    </div>
  );
};
