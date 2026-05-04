import React from 'react';

export const StatusBadge = ({ status, t, large }) => {
  const config = {
    approved: {
      border: 'border-pm-ink/30 dark:border-white/25 text-pm-ink dark:text-pm-accent-alt bg-pm-accent-alt/25 dark:bg-pm-accent-alt/15',
      dot: 'bg-pm-accent-alt'
    },
    rejected: {
      border: 'border-pm-ink/30 dark:border-white/25 text-pm-ink dark:text-pm-ink-soft bg-pm-accent/20 dark:bg-pm-accent/25',
      dot: 'bg-pm-accent'
    },
    failed: {
      border: 'border-amber-500/50 text-amber-800 dark:text-amber-200 bg-amber-500/10',
      dot: 'bg-amber-500'
    },
    pending: {
      border: 'border-zinc-400/60 text-zinc-700 dark:text-zinc-300 bg-zinc-400/15',
      dot: 'bg-zinc-500 animate-pulse dark:bg-zinc-400'
    }
  }[status] || { border: 'border-pm-ink/20 text-pm-muted bg-pm-wash/40', dot: 'bg-pm-muted' };

  const labels = {
    approved: t('result.status_approved'),
    rejected: t('result.status_rejected'),
    failed: t('result.status_failed'),
    pending: t('result.status_pending')
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-sm border-2 font-bold uppercase tracking-wider ${config.border} ${
        large ? 'text-xs' : 'text-[10px]'
      }`}
    >
      <span className={`w-2 h-2 rounded-full mr-2 ${config.dot}`} />
      {labels[status] || status}
    </span>
  );
};
