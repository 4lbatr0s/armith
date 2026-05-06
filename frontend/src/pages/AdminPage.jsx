import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

export const AdminPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  
  // Settings state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'settings'
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSuccess, setSettingsSuccess] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyToken, setApiKeyToken] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsData, verificationsData] = await Promise.all([
        apiService.getStats(),
        apiService.getVerifications(page)
      ]);

      setStats(statsData);
      setVerifications(verificationsData.users);
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
      setApiKeysLoading(true);
      const [settingsData, apiKeysData] = await Promise.all([
        apiService.getSettings(),
        apiService.getApiKeys()
      ]);
      setSettings(settingsData.settings);
      setDefaults(settingsData.defaults);
      setApiKeys(apiKeysData.apiKeys || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSettingsError(t('settings.load_error'));
    } finally {
      setSettingsLoading(false);
      setApiKeysLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'settings' && !settings) {
      fetchSettings();
    }
  }, [activeTab, fetchSettings, settings]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsSuccess(null);
      
      await apiService.updateSettings({
        verificationRules: settings.verificationRules || {},
        thresholds: settings.thresholds || {}
      });
      
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
      setSettings(data.settings);
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

  const handleCreateApiKey = async () => {
    const trimmedName = apiKeyName.trim();
    if (!trimmedName) {
      setSettingsError(t('settings.api_key_name_required'));
      return;
    }

    try {
      setSettingsSaving(true);
      setSettingsError(null);
      const data = await apiService.createApiKey(trimmedName);
      setApiKeyName('');
      setApiKeyToken(data.token);
      const listData = await apiService.getApiKeys();
      setApiKeys(listData.apiKeys || []);
      setSettingsSuccess(t('settings.api_key_create_success'));
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to create API key:', err);
      setSettingsError(err.message || t('settings.api_key_create_error'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleRevokeApiKey = async (id) => {
    if (!window.confirm(t('settings.api_key_revoke_confirm'))) return;

    try {
      setSettingsSaving(true);
      setSettingsError(null);
      await apiService.revokeApiKey(id);
      setApiKeys((prev) => prev.map((item) => (item.id === id ? { ...item, revokedAt: new Date().toISOString() } : item)));
      setSettingsSuccess(t('settings.api_key_revoke_success'));
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to revoke API key:', err);
      setSettingsError(err.message || t('settings.api_key_revoke_error'));
    } finally {
      setSettingsSaving(false);
    }
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

          <div className="flex border-2 border-pm-ink dark:border-white/20 rounded-sm overflow-hidden shadow-brutal">
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
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
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
                icon={<XCircleIcon />}
                label={t('dashboard.rejected')}
                value={stats?.rejectedCount || 0}
                color="red"
              />
        </div>

        {error && (
          <div className="mb-6 rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3 text-sm text-pm-ink dark:text-pm-ink-soft">
            {error}
          </div>
        )}

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
                </tr>
              </thead>
              <tbody className="bg-pm-surface dark:bg-pm-surface-dark divide-y divide-pm-ink/10 dark:divide-white/10">
                {verifications.length > 0 ? (
                  verifications.map((verification) => (
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-pm-muted text-sm uppercase tracking-widest">
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
            ) : settings && (
              <>
                <div className="pm-panel overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.api_keys_title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.api_keys_desc')}</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {apiKeyToken && (
                      <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 p-4">
                        <p className="text-xs uppercase tracking-widest text-pm-muted mb-2">{t('settings.api_key_one_time')}</p>
                        <code className="block w-full overflow-x-auto text-sm">{apiKeyToken}</code>
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(apiKeyToken)}
                          >
                            {t('settings.api_key_copy')}
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                        placeholder={t('settings.api_key_name_placeholder')}
                        className="flex-1 px-3 py-2 border rounded-sm bg-white dark:bg-gray-900 dark:text-white"
                        maxLength={100}
                      />
                      <Button onClick={handleCreateApiKey} disabled={settingsSaving}>
                        {t('settings.api_key_create')}
                      </Button>
                    </div>
                    {apiKeysLoading ? (
                      <p className="text-sm text-pm-muted">{t('common.loading')}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-pm-ink/10 dark:divide-white/10">
                          <thead>
                            <tr>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('settings.api_key_name')}</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('settings.api_key_prefix')}</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('settings.api_key_created')}</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('settings.api_key_last_used')}</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('settings.api_key_status')}</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('settings.api_key_actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-pm-ink/10 dark:divide-white/10">
                            {apiKeys.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="px-3 py-4 text-sm text-pm-muted">
                                  {t('settings.api_key_empty')}
                                </td>
                              </tr>
                            ) : (
                              apiKeys.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-3 text-sm text-pm-ink dark:text-pm-ink-soft">{item.name}</td>
                                  <td className="px-3 py-3 text-sm font-mono text-pm-muted">{item.prefix}</td>
                                  <td className="px-3 py-3 text-sm text-pm-muted">{new Date(item.createdAt).toLocaleString()}</td>
                                  <td className="px-3 py-3 text-sm text-pm-muted">
                                    {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : '-'}
                                  </td>
                                  <td className="px-3 py-3 text-sm text-pm-muted">
                                    {item.revokedAt ? t('settings.api_key_status_revoked') : t('settings.api_key_status_active')}
                                  </td>
                                  <td className="px-3 py-3">
                                    {!item.revokedAt && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleRevokeApiKey(item.id)}
                                        disabled={settingsSaving}
                                      >
                                        {t('settings.api_key_revoke')}
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
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
  const config = {
    approved:
      'border-pm-ink/25 dark:border-white/20 text-pm-ink dark:text-pm-accent-alt bg-pm-accent-alt/25 dark:bg-pm-accent-alt/15',
    rejected:
      'border-pm-ink/25 dark:border-white/20 text-pm-ink dark:text-pm-ink-soft bg-pm-accent/20 dark:bg-pm-accent/25',
    pending: 'border-pm-ink/20 text-pm-muted dark:border-white/25',
    failed: 'border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10'
  };

  return (
    <span
      className={`px-2 py-0.5 inline-flex text-[10px] uppercase tracking-widest font-bold border-2 rounded-sm ${
        config[status] || config.pending
      }`}
    >
      {status}
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
