import React from 'react';

export const ThresholdItem = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-pm-ink/5 dark:border-white/5 last:border-0">
    <span className="text-[10px] font-bold uppercase tracking-widest text-pm-muted">{label}</span>
    <span className="text-pm-ink dark:text-pm-ink-soft font-mono text-xs font-semibold">{value}</span>
  </div>
);
