import React from 'react';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/Skeleton';

export function ErrorsInsightTab({
  t,
  fetchErrorsInsight,
  errorsInsightLoading,
  errorsInsight,
}) {
  return (
    <div role="tabpanel" id="admin-tabpanel-errors_insight" aria-labelledby="admin-tab-errors_insight">
<div className="space-y-6">
  <div className="pm-panel overflow-hidden px-4 py-5 sm:px-6 border-b-2 border-pm-ink/10 dark:border-white/10">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">
          {t('dashboard.errors_insight_title')}
        </h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-pm-muted max-w-2xl">
          {t('dashboard.errors_insight_desc')}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => fetchErrorsInsight()}
        disabled={errorsInsightLoading}
        className="border-2 border-pm-ink/20 dark:border-white/25"
      >
        {errorsInsightLoading ? t('common.loading') : t('dashboard.errors_insight_refresh')}
      </Button>
    </div>
  </div>

  <div className="pm-panel overflow-hidden px-4 py-6 sm:px-6 transition-colors duration-200">
              {errorsInsightLoading && !errorsInsight ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-5 w-64" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !errorsInsight?.top?.length ? (
      <p className="text-center text-pm-muted text-sm uppercase tracking-widest px-4">
        {t('dashboard.errors_insight_empty')}
      </p>
    ) : (
      <div className="space-y-4">
        <p className="text-sm text-pm-muted">
          <span className="font-mono font-semibold text-pm-ink dark:text-pm-ink-soft">
            {errorsInsight.totals}
          </span>{' '}
          {t('dashboard.errors_insight_totals')}
        </p>
        <ul className="divide-y divide-pm-ink/10 dark:divide-white/10 border border-pm-ink/10 dark:border-white/10 rounded-sm">
          {errorsInsight.top.map((row) => (
            <li
              key={row.key}
              className="px-4 py-2 flex flex-wrap justify-between gap-2 text-sm items-baseline"
            >
              <span className="font-mono text-xs text-pm-ink dark:text-pm-ink-soft break-all flex-1 min-w-[12rem]">
                {row.key}
              </span>
              <span className="text-pm-muted font-bold tabular-nums shrink-0">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
</div>
    </div>
  );
}
