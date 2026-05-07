import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

function normalizeDashboardSettings(raw) {
  if (!raw) return null;
  return {
    verificationRules: raw.verificationRules || {},
    thresholds: raw.thresholds || {},
    metadata: raw.metadata
  };
}

export const AdminPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  
  // Settings state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSuccess, setSettingsSuccess] = useState(null);

  const [webhookDeliveries, setWebhookDeliveries] = useState([]);
  const [webhookPagination, setWebhookPagination] = useState(null);
  const [webhookPage, setWebhookPage] = useState(1);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [webhooksError, setWebhooksError] = useState(null);
  const [webhookFailuresOverview, setWebhookFailuresOverview] = useState([]);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [rowBusyKey, setRowBusyKey] = useState('');
  const [flashSuccess, setFlashSuccess] = useState(null);
  const [manualRows, setManualRows] = useState([]);
  const [mrPagination, setMrPagination] = useState(null);
  const [mrPage, setMrPage] = useState(1);
  const [mrLoading, setMrLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState({});
  const [errorsInsight, setErrorsInsight] = useState(null);
  const [errorsInsightLoading, setErrorsInsightLoading] = useState(false);

  const mergeServerSettings = useCallback((raw) => {
    const n = normalizeDashboardSettings(raw);
    if (!n) return;
    setSettings(n);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsData, verificationsData, webhookFailResponse] = await Promise.all([
        apiService.getStats(),
        apiService.getVerifications(page),
        apiService.getWebhookDeliveries(1, 5, { failedOnly: true }).catch(() => ({ deliveries: [] }))
      ]);

      setStats(statsData);
      setVerifications(verificationsData.users);
      setWebhookFailuresOverview(webhookFailResponse.deliveries || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [page, t]);

  const fetchSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const settingsData = await apiService.getSettings();
      mergeServerSettings(settingsData.settings);
      setDefaults(settingsData.defaults);
      setSettingsError(null);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSettingsError(t('settings.load_error'));
    } finally {
      setSettingsLoading(false);
    }
  }, [t, mergeServerSettings]);

  const fetchManualReviews = useCallback(async () => {
    try {
      setMrLoading(true);
      const data = await apiService.listManualReviews(mrPage, 10);
      setManualRows(data.users || []);
      setMrPagination(data.pagination || null);
    } catch (err) {
      console.error('Manual review queue load failed:', err);
      setError(err.message || t('common.error'));
      setManualRows([]);
      setMrPagination(null);
    } finally {
      setMrLoading(false);
    }
  }, [mrPage, t]);

  const fetchErrorsInsight = useCallback(async () => {
    try {
      setErrorsInsightLoading(true);
      const data = await apiService.getKeyedErrorSummary();
      setErrorsInsight(data);
    } catch (err) {
      console.error('Error insight load failed:', err);
      setError(err.message || t('common.error'));
      setErrorsInsight(null);
    } finally {
      setErrorsInsightLoading(false);
    }
  }, [t]);

  const fetchWebhooks = useCallback(async () => {
    try {
      setWebhooksLoading(true);
      setWebhooksError(null);
      const data = await apiService.getWebhookDeliveries(webhookPage, 20);
      setWebhookDeliveries(data.deliveries || []);
      setWebhookPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load webhook deliveries:', err);
      setWebhooksError(err.message || t('common.error'));
      setWebhookDeliveries([]);
      setWebhookPagination(null);
    } finally {
      setWebhooksLoading(false);
    }
  }, [webhookPage, t]);

  const handleDeleteVerification = async (profileId) => {
    const ok = window.confirm(t('dashboard.delete_verification_confirm'));
    if (!ok) return;
    try {
      setDeleteBusyId(profileId);
      setError(null);
      await apiService.deleteVerification(profileId);
      await fetchData();
    } catch (err) {
      console.error('Delete verification failed:', err);
      setError(err.message || t('common.error'));
    } finally {
      setDeleteBusyId(null);
    }
  };

  const bumpFlashSuccess = useCallback((message) => {
    setFlashSuccess(message);
    setTimeout(() => setFlashSuccess(null), 3500);
  }, []);

  const handleReplayWebhook = async (profileId) => {
    setFlashSuccess(null);
    setRowBusyKey(`${profileId}:replay`);
    try {
      setError(null);
      await apiService.replayTerminalWebhook(profileId);
      bumpFlashSuccess(t('dashboard.webhook_replay_queued'));
    } catch (err) {
      console.error('Replay webhook failed:', err);
      setError(err.message || t('common.error'));
    } finally {
      setRowBusyKey('');
    }
  };

  const handleEscalateManualReview = async (profileId) => {
    const ok = window.confirm(t('dashboard.escalate_manual_review_confirm'));
    if (!ok) return;
    const assigneeRaw = window.prompt(t('dashboard.manual_review_assignee_prompt'), '');
    if (assigneeRaw === null) return;
    setFlashSuccess(null);
    setRowBusyKey(`${profileId}:escalate`);
    try {
      setError(null);
      const assigneeLabel = typeof assigneeRaw === 'string' ? assigneeRaw.trim() : '';
      await apiService.enqueueManualReview(
        profileId,
        assigneeLabel ? { assigneeLabel } : {}
      );
      bumpFlashSuccess(t('dashboard.manual_review_queued_ok'));
      await fetchData();
      await fetchManualReviews();
    } catch (err) {
      console.error('Enqueue manual review failed:', err);
      setError(err.message || t('common.error'));
    } finally {
      setRowBusyKey('');
    }
  };

  const handleResolveManualReview = async (profileId, decision) => {
    setRowBusyKey(`${profileId}:${decision}`);
    setFlashSuccess(null);
    try {
      setError(null);
      const note = decision === 'REJECTED' ? rejectNotes[profileId] : undefined;
      await apiService.resolveManualReview(profileId, { decision, note });
      bumpFlashSuccess(t('dashboard.manual_review_resolve_ok'));
      setRejectNotes((prev) => {
        const next = { ...prev };
        delete next[profileId];
        return next;
      });
      await fetchManualReviews();
      await fetchData();
    } catch (err) {
      console.error('Resolve manual review failed:', err);
      setError(err.message || t('common.error'));
    } finally {
      setRowBusyKey('');
    }
  };

  const handleMintCaptureSession = async (profileId) => {
    setRowBusyKey(`${profileId}:session`);
    setFlashSuccess(null);
    try {
      setError(null);
      const data = await apiService.mintCaptureSession(profileId);
      const line = `${data.headerName}: ${data.token}`;
      try {
        await navigator.clipboard.writeText(line);
        bumpFlashSuccess(t('dashboard.capture_session_copied'));
      } catch {
        window.prompt(t('dashboard.capture_session_copy_fallback'), line);
      }
    } catch (err) {
      console.error('Mint capture session failed:', err);
      setError(err.message || t('dashboard.capture_session_failed'));
    } finally {
      setRowBusyKey('');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab, fetchSettings]);

  useEffect(() => {
    if (activeTab === 'webhooks') {
      fetchWebhooks();
    }
  }, [activeTab, fetchWebhooks]);

  useEffect(() => {
    if (activeTab === 'manual_review') {
      fetchManualReviews();
    }
  }, [activeTab, fetchManualReviews]);

  useEffect(() => {
    if (activeTab === 'errors_insight') {
      fetchErrorsInsight();
    }
  }, [activeTab, fetchErrorsInsight]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsSuccess(null);
      
      const data = await apiService.updateSettings({
        verificationRules: settings.verificationRules || {},
        thresholds: settings.thresholds || {}
      });
      if (data?.settings) {
        mergeServerSettings(data.settings);
      }
      setSettingsSuccess(t('settings.save_success'));
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSettingsError(err.message || t('settings.save_error'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleResetSettings = async () => {
    if (!window.confirm(t('settings.reset_confirm'))) return;
    
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsSuccess(null);
      
      const data = await apiService.resetSettings();
      if (data?.settings) {
        mergeServerSettings(data.settings);
      }
      setSettingsSuccess(t('settings.reset_success'));
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setSettingsError(err.message || t('settings.reset_error'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateVerificationRule = (key, value) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        verificationRules: {
          ...(prev.verificationRules || {}),
          [key]: value
        }
      };
    });
  };

  const updateThreshold = (key, value) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        thresholds: {
          ...(prev.thresholds || {}),
          [key]: value
        }
      };
    });
  };


  if (isLoading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-pm-ink dark:border-white/30 border-t-pm-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm uppercase tracking-widest text-pm-muted">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 border-b-2 border-pm-ink/10 dark:border-white/10 pb-6">
          <div>
            <span className="pm-kicker mb-2 inline-block text-[10px]">{t('layout.dashboard')}</span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-pm-ink dark:text-pm-ink-soft">
              {t('dashboard.title')}
            </h1>
          </div>

          <div className="flex flex-wrap border-2 border-pm-ink dark:border-white/20 rounded-sm overflow-hidden shadow-brutal">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-pm-accent text-white'
                  : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
              }`}
            >
              {t('dashboard.overview')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('webhooks')}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border-l-2 border-pm-ink dark:border-white/20 transition-colors ${
                activeTab === 'webhooks'
                  ? 'bg-pm-accent text-white'
                  : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
              }`}
            >
              {t('dashboard.webhooks_tab')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual_review')}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border-l-2 border-pm-ink dark:border-white/20 transition-colors ${
                activeTab === 'manual_review'
                  ? 'bg-pm-accent text-white'
                  : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
              }`}
            >
              {t('dashboard.manual_review_tab')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('errors_insight')}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border-l-2 border-pm-ink dark:border-white/20 transition-colors ${
                activeTab === 'errors_insight'
                  ? 'bg-pm-accent text-white'
                  : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
              }`}
            >
              {t('dashboard.errors_insight_tab')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border-l-2 border-pm-ink dark:border-white/20 transition-colors ${
                activeTab === 'settings'
                  ? 'bg-pm-accent text-white'
                  : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
              }`}
            >
              {t('settings.title')}
            </button>
          </div>
        </div>

        {flashSuccess && (
          <div className="mb-6 rounded-sm border-2 border-pm-accent-alt/50 bg-pm-accent-alt/10 px-4 py-3 text-sm text-pm-ink dark:text-pm-ink-soft">
            {flashSuccess}
          </div>
        )}

        {error && activeTab !== 'settings' && (
          <div className="mb-6 rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3 text-sm text-pm-ink dark:text-pm-ink-soft">
            {error}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
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
                    onClick={() => navigate('/profile?tab=security')}
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
            <Button type="button" variant="outline" className="border-2 border-pm-ink/20 shrink-0" onClick={() => setActiveTab('webhooks')}>
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
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-[10px] uppercase border-pm-ink/20 py-1 h-auto"
                              disabled={rowBusyKey === `${rowId}:replay`}
                              onClick={() => handleReplayWebhook(rowId)}
                            >
                              {rowBusyKey === `${rowId}:replay` ? t('common.loading') : t('dashboard.replay_webhook')}
                            </Button>
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
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" className="dark:bg-gray-700 dark:text-white dark:border-gray-600">
              {t('dashboard.previous')}
            </Button>
                <Button onClick={() => setPage(p => p + 1)} disabled={verifications.length < 10} variant="outline" className="dark:bg-gray-700 dark:text-white dark:border-gray-600">
              {t('dashboard.next')}
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('dashboard.showing_page')} <span className="font-medium">{page}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" className="rounded-l-md dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  {t('dashboard.previous')}
                </Button>
                    <Button onClick={() => setPage(p => p + 1)} disabled={verifications.length < 10} variant="outline" className="rounded-r-md dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  {t('dashboard.next')}
                </Button>
              </nav>
            </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'manual_review' && (
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
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-pm-ink dark:border-white/30 border-t-pm-accent rounded-full animate-spin" />
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
        )}

        {activeTab === 'errors_insight' && (
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
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-pm-ink dark:border-white/30 border-t-pm-accent rounded-full animate-spin" />
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
        )}


        {activeTab === 'webhooks' && (
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
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-pm-ink dark:border-white/30 border-t-pm-accent rounded-full animate-spin" />
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
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Messages */}
            {settingsError && (
              <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3 text-pm-ink dark:text-pm-ink-soft">
                {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="rounded-sm border-2 border-pm-accent-alt/40 bg-pm-accent-alt/10 px-4 py-3 text-pm-ink dark:text-pm-accent-alt">
                {settingsSuccess}
              </div>
            )}

            {settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-pm-ink dark:border-white/30 border-t-pm-accent rounded-full animate-spin" />
              </div>
            ) : !settings ? (
              <div className="pm-panel px-6 py-10 text-center space-y-4">
                <p className="text-sm text-pm-muted uppercase tracking-widest">{t('settings.load_error')}</p>
                <Button type="button" variant="outline" onClick={() => fetchSettings()}>
                  {t('dashboard.refresh')}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-sm border-2 border-pm-ink/15 dark:border-white/15 bg-pm-wash/40 dark:bg-white/5 px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <p className="text-sm text-pm-ink dark:text-pm-ink-soft max-w-2xl">{t('settings.integration_moved_banner')}</p>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button type="button" className="border-2 border-pm-ink/20 dark:border-white/25" onClick={() => navigate('/integrations')}>
                      {t('settings.integration_moved_webhook_cta')}
                    </Button>
                    <Button type="button" variant="outline" className="border-2" onClick={() => navigate('/profile?tab=security')}>
                      {t('settings.integration_moved_keys_cta')}
                    </Button>
                  </div>
                </div>
                {/* Verification Rules */}
                <div className="pm-panel overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {t('settings.verification_rules')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.verification_rules_desc')}</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <ToggleSwitch
                      label={t('settings.require_id_card')}
                      description={t('settings.require_id_card_desc')}
                      checked={settings.verificationRules?.requireIdCard ?? true}
                      onChange={(checked) => updateVerificationRule('requireIdCard', checked)}
                      disabled={!settings.verificationRules?.requireSelfie}
                    />
                    <ToggleSwitch
                      label={t('settings.require_selfie')}
                      description={t('settings.require_selfie_desc')}
                      checked={settings.verificationRules?.requireSelfie ?? true}
                      onChange={(checked) => updateVerificationRule('requireSelfie', checked)}
                      disabled={!settings.verificationRules?.requireIdCard}
                    />
                    
                    {/* Warning if only one is selected */}
                    {(!settings.verificationRules?.requireIdCard || !settings.verificationRules?.requireSelfie) && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {t('settings.single_verification_warning')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thresholds - ID Verification */}
                <div className="pm-panel overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      {t('settings.id_thresholds')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.id_thresholds_desc')}</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ThresholdSlider
                      label={t('settings.th_name_confidence')}
                      value={settings.thresholds?.fullNameConfidence ?? 0.8}
                      onChange={(val) => updateThreshold('fullNameConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.fullNameConfidence ?? 0.8}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_id_confidence')}
                      value={settings.thresholds?.identityNumberConfidence ?? 0.95}
                      onChange={(val) => updateThreshold('identityNumberConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.identityNumberConfidence ?? 0.95}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_dob_confidence')}
                      value={settings.thresholds?.dateOfBirthConfidence ?? 0.9}
                      onChange={(val) => updateThreshold('dateOfBirthConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.dateOfBirthConfidence ?? 0.9}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_expiry_confidence')}
                      value={settings.thresholds?.expiryDateConfidence ?? 0.9}
                      onChange={(val) => updateThreshold('expiryDateConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.expiryDateConfidence ?? 0.9}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_image_quality')}
                      value={settings.thresholds?.idMinImageQuality ?? settings.thresholds?.imageQuality ?? 0.7}
                      onChange={(val) => {
                        setSettings((prev) => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                thresholds: {
                                    ...prev.thresholds,
                                    idMinImageQuality: val,
                                    imageQuality: val
                                }
                            };
                        });
                      }}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.idMinImageQuality ?? defaults?.thresholds?.imageQuality ?? 0.7}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_min_document_vitality')}
                      value={settings.thresholds?.minDocumentVitalityConfidence ?? 0.45}
                      onChange={(val) => updateThreshold('minDocumentVitalityConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.minDocumentVitalityConfidence ?? 0.45}
                      format="percent"
                    />
                  </div>
                </div>

                {/* Thresholds - Selfie Verification */}
                <div className="pm-panel overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-pm-accent-alt" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('settings.selfie_thresholds')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.selfie_thresholds_desc')}</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ThresholdSlider
                      label={t('settings.th_match_confidence')}
                      value={settings.thresholds?.matchConfidence ?? 80}
                      onChange={(val) => updateThreshold('matchConfidence', val)}
                      min={0}
                      max={100}
                      step={5}
                      defaultValue={defaults?.thresholds?.matchConfidence ?? 80}
                      format="number"
                      suffix="%"
                    />
                    <ThresholdSlider
                      label={t('settings.th_face_detection')}
                      value={settings.thresholds?.faceDetectionConfidence ?? 0.8}
                      onChange={(val) => updateThreshold('faceDetectionConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.faceDetectionConfidence ?? 0.8}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_spoofing_max')}
                      value={settings.thresholds?.spoofingRiskMax ?? 0.3}
                      onChange={(val) => updateThreshold('spoofingRiskMax', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.spoofingRiskMax ?? 0.3}
                      format="percent"
                      inverse
                    />
                    <ThresholdSlider
                      label={t('settings.th_min_liveness')}
                      value={settings.thresholds?.minLivenessConfidence ?? 0.7}
                      onChange={(val) => updateThreshold('minLivenessConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.minLivenessConfidence ?? 0.7}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_selfie_image_quality')}
                      value={settings.thresholds?.selfieMinImageQuality ?? 0.6}
                      onChange={(val) => updateThreshold('selfieMinImageQuality', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds?.selfieMinImageQuality ?? 0.6}
                      format="percent"
                    />
                  </div>
                </div>

                {/* Thresholds - Age */}
                <div className="pm-panel overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t('settings.age_constraints')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.age_constraints_desc')}</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ThresholdSlider
                      label={t('settings.th_min_age')}
                      value={settings.thresholds?.minAge ?? 18}
                      onChange={(val) => updateThreshold('minAge', val)}
                      min={0}
                      max={100}
                      step={1}
                      defaultValue={defaults?.thresholds?.minAge ?? 18}
                      format="number"
                      suffix={` ${t('settings.years')}`}
                    />
                    <ThresholdSlider
                      label={t('settings.th_max_age')}
                      value={settings.thresholds?.maxAge ?? 120}
                      onChange={(val) => updateThreshold('maxAge', val)}
                      min={50}
                      max={150}
                      step={1}
                      defaultValue={defaults?.thresholds?.maxAge ?? 120}
                      format="number"
                      suffix={` ${t('settings.years')}`}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                  <Button
                    onClick={handleResetSettings}
                    variant="outline"
                    disabled={settingsSaving}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    {t('settings.reset_defaults')}
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      onClick={fetchSettings}
                      variant="outline"
                      disabled={settingsSaving}
                      className="border-gray-300 dark:border-gray-600"
                    >
                      {t('settings.discard_changes')}
                    </Button>
                    <Button
                      onClick={handleSaveSettings}
                      disabled={settingsSaving}
                      className="min-w-[120px] shadow-brutal border-2 border-pm-ink dark:border-white/20"
                    >
                      {settingsSaving ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          {t('settings.saving')}
                        </div>
                      ) : (
                        t('settings.save_changes')
                      )}
                    </Button>
                  </div>
                </div>

                {/* Last Updated */}
                {settings.metadata?.lastUpdated && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.last_updated')}: {new Date(settings.metadata.lastUpdated).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

const StatCard = ({ icon, label, value, color }) => {
  const colorClasses = {
    gray: 'text-pm-muted',
    green: 'text-pm-accent-alt',
    yellow: 'text-amber-500',
    red: 'text-pm-accent'
  };

  return (
    <div className="pm-panel overflow-hidden transition-colors duration-200">
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex-shrink-0 ${colorClasses[color]}`}>{icon}</div>
          <div className="min-w-0 flex-1">
            <dl>
              <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-pm-muted truncate">{label}</dt>
              <dd className="font-display text-2xl font-bold text-pm-ink dark:text-pm-ink-soft">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = String(status ?? 'unknown').toLowerCase();
  const label = String(status ?? '').toUpperCase();

  const config = {
    approved:
      'border-pm-ink/25 dark:border-white/20 text-pm-ink dark:text-pm-accent-alt bg-pm-accent-alt/25 dark:bg-pm-accent-alt/15',
    rejected:
      'border-pm-ink/25 dark:border-white/20 text-pm-ink dark:text-pm-ink-soft bg-pm-accent/20 dark:bg-pm-accent/25',
    pending: 'border-pm-ink/20 text-pm-muted dark:border-white/25',
    failed: 'border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10',
    under_review: 'border-sky-500/40 text-sky-800 dark:text-sky-200 bg-sky-500/10'
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
};

const ToggleSwitch = ({ label, description, checked, onChange, disabled }) => (
  <div
    className={`flex items-center justify-between p-4 rounded-sm border-2 ${disabled ? 'opacity-50' : ''} ${
      checked
        ? 'bg-pm-accent/10 border-pm-accent/40'
        : 'bg-pm-wash/40 dark:bg-pm-void/80 border-pm-ink/10 dark:border-white/10'
    }`}
  >
    <div className="flex-1 pr-4">
      <p className="font-display font-semibold text-pm-ink dark:text-pm-ink-soft">{label}</p>
      <p className="text-sm text-pm-muted mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-pm-ink/20 dark:border-white/20 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pm-accent focus:ring-offset-2 ${
        checked ? 'bg-pm-accent' : 'bg-pm-muted/30'
      } ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const ThresholdSlider = ({ label, value, onChange, min, max, step, defaultValue, format, suffix = '', inverse }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = format === 'percent' ? `${Math.round(value * 100)}%` : `${value}${suffix}`;
  const defaultDisplay = format === 'percent' ? `${Math.round(defaultValue * 100)}%` : `${defaultValue}${suffix}`;
  
  const isGood = inverse ? value <= defaultValue : value >= defaultValue;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <span className={`text-sm font-semibold ${isGood ? 'text-pm-accent-alt dark:text-pm-accent-alt' : 'text-amber-600 dark:text-amber-400'}`}>
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, ${isGood ? '#00c9b7' : '#f59e0b'} 0%, ${isGood ? '#00c9b7' : '#f59e0b'} ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
        }}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Default: {defaultDisplay}
      </p>
    </div>
  );
};

// Icons
const ClipboardListIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const KeyIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
  </svg>
);
