import React from 'react';

export function StatusBadge({ status }) {
  const normalized = String(status ?? 'unknown').toLowerCase();
  const label = String(status ?? '').toUpperCase();

  const config = {
    approved:
      'border-pm-ink/25 dark:border-white/20 text-pm-ink dark:text-pm-accent-alt bg-pm-accent-alt/25 dark:bg-pm-accent-alt/15',
    rejected:
      'border-pm-ink/25 dark:border-white/20 text-pm-ink dark:text-pm-ink-soft bg-pm-accent/20 dark:bg-pm-accent/25',
    pending: 'border-pm-ink/20 text-pm-muted dark:border-white/25',
    failed: 'border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10',
    under_review: 'border-sky-500/40 text-sky-800 dark:text-sky-200 bg-sky-500/10',
  };

  return (
    <span
      className={`px-2 py-0.5 inline-flex text-[10px] uppercase tracking-widest font-bold border-2 rounded-sm ${
        config[normalized] || config.pending
      }`}
    >
      {label}
    </span>
  );
}
