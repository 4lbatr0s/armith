import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { notify } from '../lib/notify';
import { useTranslation } from 'react-i18next';
import { TabsBar } from '../components/admin/TabsBar';
import { DashboardTab } from './admin/tabs/DashboardTab';
import { ManualReviewTab } from './admin/tabs/ManualReviewTab';
import { ErrorsInsightTab } from './admin/tabs/ErrorsInsightTab';
import { WebhooksTab } from './admin/tabs/WebhooksTab';
import { SettingsTab } from './admin/tabs/SettingsTab';
import { useAdminDashboardSync } from './admin/useAdminDashboardSync';

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
  const VALID_TABS = ['dashboard', 'webhooks', 'manual_review', 'errors_insight', 'settings'];
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'dashboard';

  const setActiveTab = useCallback(
    (tab) => {
      if (tab === 'dashboard') setSearchParams({});
      else setSearchParams({ tab });
    },
    [setSearchParams]
  );

  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState(null);

  const [webhookDeliveries, setWebhookDeliveries] = useState([]);
  const [webhookPagination, setWebhookPagination] = useState(null);
  const [webhookPage, setWebhookPage] = useState(1);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [webhooksError, setWebhooksError] = useState(null);
  const [webhookFailuresOverview, setWebhookFailuresOverview] = useState([]);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [rowBusyKey, setRowBusyKey] = useState('');
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

  const handleReplayWebhook = async (profileId, { useStoredDelivery = false } = {}) => {
    const busySuffix = useStoredDelivery ? 'replayStored' : 'replay';
    setRowBusyKey(`${profileId}:${busySuffix}`);
    try {
      setError(null);
      const data = await apiService.replayTerminalWebhook(profileId, { useStoredDelivery });
      const src = data?.replaySource;
      if (useStoredDelivery && src === 'stored') {
        notify.success(t('dashboard.webhook_replay_stored_payload'));
      } else if (useStoredDelivery && src === 'live') {
        notify.success(t('dashboard.webhook_replay_live_fallback'));
      } else {
        notify.success(t('dashboard.webhook_replay_queued'));
      }
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
    setRowBusyKey(`${profileId}:escalate`);
    try {
      setError(null);
      const assigneeLabel = typeof assigneeRaw === 'string' ? assigneeRaw.trim() : '';
      await apiService.enqueueManualReview(
        profileId,
        assigneeLabel ? { assigneeLabel } : {}
      );
      notify.success(t('dashboard.manual_review_queued_ok'));
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
    try {
      setError(null);
      const note = decision === 'REJECTED' ? rejectNotes[profileId] : undefined;
      await apiService.resolveManualReview(profileId, { decision, note });
      notify.success(t('dashboard.manual_review_resolve_ok'));
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
    try {
      setError(null);
      const data = await apiService.mintCaptureSession(profileId);
      const line = `${data.headerName}: ${data.token}`;
      try {
        await navigator.clipboard.writeText(line);
        notify.success(t('dashboard.capture_session_copied'));
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

  useAdminDashboardSync(activeTab, fetchData, setIsLoading);

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

      const data = await apiService.updateSettings({
        verificationRules: settings.verificationRules || {},
        thresholds: settings.thresholds || {}
      });
      if (data?.settings) {
        mergeServerSettings(data.settings);
      }
      notify.success(t('settings.save_success'));
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

      const data = await apiService.resetSettings();
      if (data?.settings) {
        mergeServerSettings(data.settings);
      }
      notify.success(t('settings.reset_success'));
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
  const adminTabs = useMemo(
    () => [
      { id: 'dashboard', label: t('dashboard.overview') },
      { id: 'webhooks', label: t('dashboard.webhooks_tab') },
      { id: 'manual_review', label: t('dashboard.manual_review_tab') },
      { id: 'errors_insight', label: t('dashboard.errors_insight_tab') },
      { id: 'settings', label: t('settings.title') },
    ],
    [t]
  );

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

          <TabsBar tabs={adminTabs} value={activeTab} onChange={setActiveTab} ariaLabel={t('layout.dashboard_tabs')} />
        </div>

        {error && activeTab !== 'settings' && (
          <div className="mb-6 rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3 text-sm text-pm-ink dark:text-pm-ink-soft">
            {error}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            t={t}
            navigate={navigate}
            fetchData={fetchData}
            isLoading={isLoading}
            stats={stats}
            webhookFailuresOverview={webhookFailuresOverview}
            verifications={verifications}
            page={page}
            setPage={setPage}
            onOpenWebhooksTab={() => setActiveTab('webhooks')}
            handleReplayWebhook={handleReplayWebhook}
            handleEscalateManualReview={handleEscalateManualReview}
            handleMintCaptureSession={handleMintCaptureSession}
            handleDeleteVerification={handleDeleteVerification}
            rowBusyKey={rowBusyKey}
            deleteBusyId={deleteBusyId}
          />
        )}

        {activeTab === 'manual_review' && (
          <ManualReviewTab
            t={t}
            navigate={navigate}
            fetchManualReviews={fetchManualReviews}
            mrLoading={mrLoading}
            manualRows={manualRows}
            mrPagination={mrPagination}
            mrPage={mrPage}
            setMrPage={setMrPage}
            rowBusyKey={rowBusyKey}
            handleResolveManualReview={handleResolveManualReview}
            rejectNotes={rejectNotes}
            setRejectNotes={setRejectNotes}
          />
        )}

        {activeTab === 'errors_insight' && (
          <ErrorsInsightTab
            t={t}
            fetchErrorsInsight={fetchErrorsInsight}
            errorsInsightLoading={errorsInsightLoading}
            errorsInsight={errorsInsight}
          />
        )}

        {activeTab === 'webhooks' && (
          <WebhooksTab
            t={t}
            fetchWebhooks={fetchWebhooks}
            webhooksLoading={webhooksLoading}
            webhooksError={webhooksError}
            webhookDeliveries={webhookDeliveries}
            webhookPagination={webhookPagination}
            webhookPage={webhookPage}
            setWebhookPage={setWebhookPage}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            t={t}
            settingsError={settingsError}
            settingsLoading={settingsLoading}
            settings={settings}
            setSettings={setSettings}
            defaults={defaults}
            fetchSettings={fetchSettings}
            settingsSaving={settingsSaving}
            handleSaveSettings={handleSaveSettings}
            handleResetSettings={handleResetSettings}
            updateVerificationRule={updateVerificationRule}
            updateThreshold={updateThreshold}
          />
        )}
      </div>
    </div>
  );
};
