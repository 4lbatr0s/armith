import React from 'react';
import { Button } from '../../../components/ui/button';
import { StatCard } from '../../../components/admin/StatCard';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  ClipboardListIcon,
  DocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  KeyIcon,
} from '../../../components/admin/AdminIcons';

export function DashboardTab({
  t,
  navigate,
  fetchData,
  isLoading,
  stats,
  webhookFailuresOverview,
  verifications,
  page,
  setPage,
  onOpenWebhooksTab,
  handleReplayWebhook,
  handleEscalateManualReview,
  handleMintCaptureSession,
  handleDeleteVerification,
  rowBusyKey,
  deleteBusyId,
}) {
  if (isLoading && !stats) {
    return (
      <div
        role="tabpanel"
        id="admin-tabpanel-dashboard"
        aria-labelledby="admin-tab-dashboard"
        className="space-y-6"
      >
        <Skeleton className="h-36 w-full max-w-4xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="pm-panel overflow-hidden p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="pm-panel overflow-hidden p-4">
          <Skeleton className="h-6 w-56 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" id="admin-tabpanel-dashboard" aria-labelledby="admin-tab-dashboard">
        <div className="mb-8 rounded-sm border-2 border-pm-ink shadow-brutal bg-pm-ink p-6 sm:p-8 text-white dark:border-white/25 dark:bg-pm-surface-dark dark:text-pm-ink-soft dark:shadow-brutal">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-white dark:text-pm-ink-soft">
                {t('dashboard.welcome')}
              </h2>
              <p className="mt-2 text-base leading-relaxed text-zinc-200 dark:text-zinc-300 max-w-xl">
                {t('dashboard.welcome_desc')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={() => navigate('/upload-id')}
                className="bg-pm-accent text-white border-2 border-white/30 hover:opacity-95 shadow-brutal dark:border-pm-ink/30"
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {t('dashboard.start_verification')}
              </Button>
              <Button
                onClick={fetchData}
                variant="outline"
                className="border-2 border-white/50 bg-white/10 text-white hover:bg-white/20 dark:border-white/25 dark:text-pm-ink-soft dark:hover:bg-white/10"
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
                {t('dashboard.refresh')}
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/integrations?tab=api-keys')}
                variant="outline"
                className="border-2 border-white/50 bg-white/10 text-white hover:bg-white/20 dark:border-white/25 dark:text-pm-ink-soft dark:hover:bg-white/10"
              >
                {t('dashboard.manage_api_keys')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          <StatCard
            icon={<DocumentIcon />}
            label={t('dashboard.total_verifications')}
            value={stats?.totalVerifications || 0}
            color="gray"
          />
          <StatCard
            icon={<CheckCircleIcon />}
            label={t('dashboard.approval_rate')}
            value={`${stats?.approvalRate || 0}%`}
            color="green"
          />
          <StatCard
            icon={<ClockIcon />}
            label={t('dashboard.pending_review')}
            value={stats?.pendingCount || 0}
            color="yellow"
          />
          <StatCard
            icon={<ClipboardListIcon />}
            label={t('dashboard.under_review_stat')}
            value={stats?.underReviewCount ?? 0}
            color="yellow"
          />
          <StatCard
            icon={<XCircleIcon />}
            label={t('dashboard.rejected')}
            value={stats?.rejectedCount || 0}
            color="red"
          />
          <StatCard
            icon={<KeyIcon />}
            label={t('dashboard.active_api_keys')}
            value={stats?.activeApiKeysCount ?? 0}
            color="gray"
          />
        </div>

        <div className="pm-panel overflow-hidden mb-8">
          <div className="px-4 py-5 sm:px-6 border-b-2 border-pm-ink/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">{t('dashboard.recent_webhook_failures')}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-pm-muted max-w-xl">{t('dashboard.recent_webhook_failures_desc')}</p>
        </div>
        <Button type="button" variant="outline" className="border-2 border-pm-ink/20 shrink-0" onClick={onOpenWebhooksTab}>
          {t('dashboard.view_all_webhooks')}
        </Button>
          </div>
          <div className="overflow-x-auto">
        {webhookFailuresOverview.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-pm-muted uppercase tracking-widest">{t('dashboard.no_webhook_failures')}</p>
        ) : (
          <table className="min-w-full divide-y divide-pm-ink/10 dark:divide-white/10">
            <thead className="bg-pm-wash/50 dark:bg-pm-void/80">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_event')}</th>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_http')}</th>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_profile')}</th>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_created')}</th>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.webhooks_error')}</th>
              </tr>
            </thead>
            <tbody className="bg-pm-surface dark:bg-pm-surface-dark divide-y divide-pm-ink/10 dark:divide-white/10">
              {webhookFailuresOverview.map((row) => (
                <tr key={String(row.id)} className="text-sm">
                  <td className="px-4 py-3 font-mono text-xs">{row.event}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.httpStatus ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs max-w-[8rem] truncate">{row.profileId ? String(row.profileId) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-pm-muted">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-xs text-pm-muted max-w-md truncate">{row.errorMessage || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
          </div>
        </div>

        <div className="pm-panel overflow-hidden sm:rounded-sm transition-colors duration-200">
          <div className="px-4 py-5 sm:px-6 border-b-2 border-pm-ink/10 dark:border-white/10">
        <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">{t('dashboard.recent_verifications')}</h3>
        <p className="mt-1 max-w-2xl text-xs font-semibold uppercase tracking-widest text-pm-muted">{t('dashboard.recent_verifications_desc')}</p>
          </div>
          <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-pm-ink/10 dark:divide-white/10">
          <thead className="bg-pm-wash/50 dark:bg-pm-void/80">
            <tr>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.name')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.tckn')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.id_status')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.selfie_status')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.overall_status')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.date')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('common.view')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.actions')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-pm-muted uppercase tracking-[0.15em]">{t('dashboard.delete_data')}</th>
            </tr>
          </thead>
          <tbody className="bg-pm-surface dark:bg-pm-surface-dark divide-y divide-pm-ink/10 dark:divide-white/10">
            {verifications.length > 0 ? (
              verifications.map((verification) => {
                const rowId = String(verification.id);
                const ost = String(verification.status ?? '').toUpperCase();
                const canReplayTerminal = ['APPROVED', 'REJECTED', 'FAILED'].includes(ost);
                const canEscalatePending = ost === 'PENDING';
                return (
                <tr key={verification.id} className="hover:bg-pm-wash/40 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-pm-ink dark:text-pm-ink-soft">
                    {verification.fullName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-pm-muted font-mono">
                    {verification.identityNumber ? `${verification.identityNumber.substring(0, 3)}***${verification.identityNumber.substring(verification.identityNumber.length - 2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {verification.idVerification?.completed ? (
                      <StatusBadge status={verification.idVerification.status} />
                    ) : (
                      <span className="text-xs text-pm-muted">{t('dashboard.not_started')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {verification.selfieVerification?.completed ? (
                      <StatusBadge status={verification.selfieVerification.status} />
                    ) : (
                      <span className="text-xs text-pm-muted">{t('dashboard.not_started')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={verification.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-pm-muted">
                    {new Date(verification.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-pm-muted">
                    <Button
                      variant="link"
                      className="text-pm-accent p-0 h-auto font-bold uppercase tracking-wide"
                          onClick={() => navigate(`/result/${verification.id}`)}
                    >
                      {t('common.view')}
                    </Button>
                  </td>
                  <td className="px-6 py-4 text-sm align-top">
                    <div className="flex flex-col gap-2 max-w-[10rem]">
                      {canReplayTerminal && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-[10px] uppercase border-pm-ink/20 py-1 h-auto"
                            disabled={rowBusyKey === `${rowId}:replay`}
                            onClick={() => handleReplayWebhook(rowId)}
                            title={t('dashboard.replay_webhook_tooltip')}
                          >
                            {rowBusyKey === `${rowId}:replay` ? t('common.loading') : t('dashboard.replay_webhook')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-[10px] uppercase border-pm-ink/20 py-1 h-auto"
                            disabled={rowBusyKey === `${rowId}:replayStored`}
                            onClick={() => handleReplayWebhook(rowId, { useStoredDelivery: true })}
                            title={t('dashboard.replay_webhook_stored_tooltip')}
                          >
                            {rowBusyKey === `${rowId}:replayStored`
                              ? t('common.loading')
                              : t('dashboard.replay_webhook_stored')}
                          </Button>
                        </>
                      )}
                      {canEscalatePending && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-[10px] uppercase border-pm-ink/20 py-1 h-auto"
                          disabled={rowBusyKey === `${rowId}:escalate`}
                          onClick={() => handleEscalateManualReview(rowId)}
                        >
                          {rowBusyKey === `${rowId}:escalate`
                            ? t('common.loading')
                            : t('dashboard.escalate_manual_review')}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[10px] uppercase border-pm-ink/20 py-1 h-auto"
                        disabled={rowBusyKey === `${rowId}:session`}
                        onClick={() => handleMintCaptureSession(rowId)}
                      >
                        {rowBusyKey === `${rowId}:session`
                          ? t('common.loading')
                          : t('dashboard.capture_session_btn')}
                      </Button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs uppercase border-pm-accent/40"
                      disabled={deleteBusyId === String(verification.id)}
                      onClick={() => handleDeleteVerification(String(verification.id))}
                    >
                      {deleteBusyId === String(verification.id) ? t('common.loading') : t('dashboard.delete_data')}
                    </Button>
                  </td>
                </tr>
              );
              })
            ) : (
              <tr>
                <td colSpan="9" className="px-6 py-10 text-center text-pm-muted text-sm uppercase tracking-widest">
                      {t('dashboard.no_verifications')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="pm-panel px-4 py-3 flex items-center justify-between sm:px-6 mt-4 transition-colors duration-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" className="dark:bg-pm-surface-dark dark:text-pm-ink-soft dark:border-white/20">
          {t('dashboard.previous')}
        </Button>
            <Button onClick={() => setPage(p => p + 1)} disabled={verifications.length < 10} variant="outline" className="dark:bg-pm-surface-dark dark:text-pm-ink-soft dark:border-white/20">
          {t('dashboard.next')}
        </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-pm-ink dark:text-pm-ink-soft">
            {t('dashboard.showing_page')} <span className="font-medium">{page}</span>
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" className="rounded-l-md dark:bg-pm-surface-dark dark:text-pm-ink-soft dark:border-white/20">
              {t('dashboard.previous')}
            </Button>
                <Button onClick={() => setPage(p => p + 1)} disabled={verifications.length < 10} variant="outline" className="rounded-r-md dark:bg-pm-surface-dark dark:text-pm-ink-soft dark:border-white/20">
              {t('dashboard.next')}
            </Button>
          </nav>
        </div>
          </div>
        </div>

    </div>
  );
}
