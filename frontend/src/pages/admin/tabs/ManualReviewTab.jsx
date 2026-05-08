import React from 'react';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { SkeletonRow } from '../../../components/ui/Skeleton';

export function ManualReviewTab({
  t,
  navigate,
  fetchManualReviews,
  mrLoading,
  manualRows,
  mrPagination,
  mrPage,
  setMrPage,
  rowBusyKey,
  handleResolveManualReview,
  rejectNotes,
  setRejectNotes,
}) {
  return (
    <div role="tabpanel" id="admin-tabpanel-manual_review" aria-labelledby="admin-tab-manual_review">
<div className="space-y-6">
  <div className="pm-panel overflow-hidden px-4 py-5 sm:px-6 border-b-2 border-pm-ink/10 dark:border-white/10">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">
          {t('dashboard.manual_review_title')}
        </h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-pm-muted max-w-2xl">
          {t('dashboard.manual_review_desc')}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => fetchManualReviews()}
        disabled={mrLoading}
        className="border-2 border-pm-ink/20 dark:border-white/25"
      >
        {mrLoading ? t('common.loading') : t('dashboard.refresh')}
      </Button>
    </div>
  </div>

  <div className="pm-panel overflow-hidden transition-colors duration-200">
    {mrLoading && manualRows.length === 0 ? (
      <div className="overflow-x-auto px-2 py-4">
        <table className="min-w-full">
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} cols={8} />
            ))}
          </tbody>
        </table>
      </div>
    ) : manualRows.length === 0 ? (
      <p className="px-6 py-10 text-center text-pm-muted text-sm uppercase tracking-widest">
        {t('dashboard.manual_review_empty')}
      </p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-pm-ink/10 dark:divide-white/10">
          <thead className="bg-pm-wash/50 dark:bg-pm-void/80">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]"
              >
                {t('dashboard.name')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]"
              >
                {t('dashboard.overall_status')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]"
              >
                {t('dashboard.manual_review_col_assignee')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]"
              >
                {t('dashboard.manual_review_col_queued_at')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]"
              >
                {t('dashboard.manual_review_col_deadline')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]"
              >
                {t('dashboard.date')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]"
              >
                {t('common.view')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]"
              >
                {t('dashboard.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-pm-surface dark:bg-pm-surface-dark divide-y divide-pm-ink/10 dark:divide-white/10">
            {manualRows.map((row) => {
              const mid = String(row.id);
              const isoCell = (v) => (v ? new Date(v).toLocaleString() : '—');
              return (
                <tr key={mid} className="text-sm">
                  <td className="px-4 py-3 font-semibold text-pm-ink dark:text-pm-ink-soft">
                    {row.fullName || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-pm-muted text-xs max-w-[8rem] break-words">
                    {row.manualReviewAssigneeLabel || '—'}
                  </td>
                  <td className="px-4 py-3 text-pm-muted text-xs whitespace-nowrap">
                    {isoCell(row.manualReviewQueuedAt)}
                  </td>
                  <td className="px-4 py-3 text-pm-muted text-xs whitespace-nowrap">
                    {isoCell(row.manualReviewDeadlineAt)}
                  </td>
                  <td className="px-4 py-3 text-pm-muted">
                    {isoCell(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="link"
                      className="text-pm-accent p-0 h-auto font-bold uppercase tracking-wide"
                      onClick={() => navigate(`/result/${mid}`)}
                    >
                      {t('common.view')}
                    </Button>
                  </td>
                  <td className="px-4 py-3 align-top space-y-2 max-w-xs">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="text-[10px] uppercase bg-pm-accent-alt/20 border-2 border-pm-accent-alt/40"
                        disabled={rowBusyKey === `${mid}:APPROVED`}
                        onClick={() => handleResolveManualReview(mid, 'APPROVED')}
                      >
                        {rowBusyKey === `${mid}:APPROVED` ? t('common.loading') : t('dashboard.approve')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-[10px] uppercase border-pm-accent/40"
                        disabled={rowBusyKey === `${mid}:REJECTED`}
                        onClick={() => handleResolveManualReview(mid, 'REJECTED')}
                      >
                        {rowBusyKey === `${mid}:REJECTED` ? t('common.loading') : t('dashboard.reject')}
                      </Button>
                    </div>
                    <textarea
                      value={rejectNotes[mid] ?? ''}
                      onChange={(e) =>
                        setRejectNotes((prev) => ({ ...prev, [mid]: e.target.value }))
                      }
                      placeholder={t('dashboard.reject_note_placeholder')}
                      rows={2}
                      className="w-full border-2 border-pm-ink/15 rounded-sm px-2 py-1 text-xs bg-pm-surface dark:bg-pm-surface-dark text-pm-ink dark:text-pm-ink-soft"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>

  {mrPagination && manualRows.length > 0 ? (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2">
      <p className="text-sm text-pm-muted uppercase tracking-wide">
        {t('dashboard.showing_page')} <span className="font-mono">{mrPagination.currentPage ?? mrPage}</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={mrPage <= 1}
          onClick={() => setMrPage((p) => Math.max(1, p - 1))}
        >
          {t('dashboard.previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={mrPagination?.hasNext === false}
          onClick={() => setMrPage((p) => p + 1)}
        >
          {t('dashboard.next')}
        </Button>
      </div>
    </div>
  ) : null}
</div>
    </div>
  );
}
