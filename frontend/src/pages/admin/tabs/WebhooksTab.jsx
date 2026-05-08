import React from 'react';
import { Button } from '../../../components/ui/button';
import { SkeletonRow } from '../../../components/ui/Skeleton';

export function WebhooksTab({
  t,
  fetchWebhooks,
  webhooksLoading,
  webhooksError,
  webhookDeliveries,
  webhookPagination,
  webhookPage,
  setWebhookPage,
}) {
  return (
    <div role="tabpanel" id="admin-tabpanel-webhooks" aria-labelledby="admin-tab-webhooks">
<div className="space-y-6">
  <div className="pm-panel overflow-hidden px-4 py-5 sm:px-6 border-b-2 border-pm-ink/10 dark:border-white/10">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">{t('dashboard.webhooks_tab')}</h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-pm-muted max-w-xl">{t('dashboard.webhooks_desc')}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={fetchWebhooks}
        disabled={webhooksLoading}
        className="border-2 border-pm-ink/20 dark:border-white/25"
      >
        {webhooksLoading ? t('common.loading') : t('dashboard.webhooks_refresh')}
      </Button>
    </div>
  </div>
  {webhooksError && (
    <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3 text-sm text-pm-ink dark:text-pm-ink-soft">{webhooksError}</div>
  )}
  <div className="pm-panel overflow-hidden transition-colors duration-200">
              {webhooksLoading ? (
                <div className="overflow-x-auto px-2 py-4">
                  <table className="min-w-full">
                    <tbody>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonRow key={i} cols={8} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : webhookDeliveries.length === 0 && !webhooksError ? (
      <p className="px-6 py-10 text-center text-pm-muted text-sm uppercase tracking-widest">{t('dashboard.webhooks_empty')}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-pm-ink/10 dark:divide-white/10">
          <thead className="bg-pm-wash/50 dark:bg-pm-void/80">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_event')}</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_succeeded')}</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_http')}</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_attempts')}</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_profile')}</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_delivery_id')}</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_created')}</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_error')}</th>
            </tr>
          </thead>
          <tbody className="bg-pm-surface dark:bg-pm-surface-dark divide-y divide-pm-ink/10 dark:divide-white/10">
            {webhookDeliveries.map((row) => {
              const err = row.errorMessage
                ? String(row.errorMessage).length > 80
                  ? `${String(row.errorMessage).slice(0, 80)}…`
                  : String(row.errorMessage)
                : '—';
              const pid = row.profileId ? String(row.profileId) : '—';
              return (
                <tr key={row.id || row.deliveryId} className="hover:bg-pm-wash/40 dark:hover:bg-white/5">
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold font-mono text-pm-ink dark:text-pm-ink-soft">{row.event || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-pm-muted">{row.succeeded ? 'yes' : 'no'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-pm-muted">{row.httpStatus ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-pm-muted">{row.attempts ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-pm-muted max-w-[120px] truncate" title={pid}>{pid}</td>
                  <td className="px-4 py-3 text-xs font-mono text-pm-muted max-w-[140px] truncate" title={row.deliveryId}>{row.deliveryId || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-pm-muted">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-pm-muted max-w-[200px]" title={row.errorMessage || ''}>{err}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
  {webhookPagination && webhookPagination.total > 0 && (
    <div className="flex justify-between items-center flex-wrap gap-2">
      <p className="text-sm text-pm-muted">
        {t('dashboard.showing_page')} <span className="font-medium">{webhookPagination.currentPage}</span> / {webhookPagination.totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" disabled={webhookPage <= 1} onClick={() => setWebhookPage((p) => Math.max(1, p - 1))}>{t('dashboard.previous')}</Button>
        <Button variant="outline" disabled={!webhookPagination.hasNext} onClick={() => setWebhookPage((p) => p + 1)}>{t('dashboard.next')}</Button>
      </div>
    </div>
  )}
</div>
    </div>
  );
}
