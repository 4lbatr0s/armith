import React from 'react';

export const StatusBadge = ({ status, t, large }) => {
  const config = {
    approved: {
      border: 'border-pm-accent-alt/50 text-pm-accent-alt bg-pm-accent-alt/10',
      dot: 'bg-pm-accent-alt'
    },
    rejected: { border: 'border-red-600/50 text-red-700 dark:text-red-300 bg-red-600/10', dot: 'bg-red-600' },
    failed: {
      border: 'border-amber-500/50 text-amber-800 dark:text-amber-200 bg-amber-500/10',
      dot: 'bg-amber-500'
    },
    pending: {
      border: 'border-pm-accent/50 text-pm-accent bg-pm-accent/10',
      dot: 'bg-pm-accent animate-pulse'
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
