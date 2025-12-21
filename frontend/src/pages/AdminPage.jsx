import React, { useEffect, useState } from 'react';
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
  const [totalPages, setTotalPages] = useState(1);
  
  // Settings state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'settings'
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSuccess, setSettingsSuccess] = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsData, verificationsData] = await Promise.all([
        apiService.getStats(),
        apiService.getVerifications(page)
      ]);

      setStats(statsData);
      setVerifications(verificationsData.users);
      setTotalPages(verificationsData.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const data = await apiService.getSettings();
      setSettings(data.settings);
      setDefaults(data.defaults);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSettingsError(t('settings.load_error'));
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  useEffect(() => {
    if (activeTab === 'settings' && !settings) {
      fetchSettings();
    }
  }, [activeTab]);

  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsSuccess(null);
      
      await apiService.updateSettings({
        verificationRules: settings.verificationRules,
        thresholds: settings.thresholds
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
    setSettings(prev => ({
      ...prev,
      verificationRules: {
        ...prev.verificationRules,
        [key]: value
      }
    }));
  };

  const updateThreshold = (key, value) => {
    setSettings(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: value
      }
    }));
  };

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header with Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
          
          {/* Tabs */}
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('dashboard.overview')}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('settings.title')}
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Welcome Section with Quick Actions */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-xl shadow-lg mb-6 p-6 text-white">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{t('dashboard.welcome')}</h2>
                  <p className="text-blue-100 dark:text-blue-200">{t('dashboard.welcome_desc')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => navigate('/upload-id')}
                    className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-md"
                  >
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('dashboard.start_verification')}
                  </Button>
                  <Button
                    onClick={fetchData}
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
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
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            {/* Recent Verifications Table */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg transition-colors duration-200">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{t('dashboard.recent_verifications')}</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{t('dashboard.recent_verifications_desc')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('dashboard.country')}</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('common.view')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {verifications.length > 0 ? (
                      verifications.map((verification) => (
                        <tr key={verification.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white font-mono">
                            {verification.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 uppercase">
                            {verification.country}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={verification.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(verification.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <Button
                              variant="link"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-0 h-auto font-medium"
                              onClick={() => navigate(`/result/${verification.id}`)}
                            >
                              {t('common.view')}
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                          {t('dashboard.no_verifications')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 mt-4 rounded-lg shadow transition-colors duration-200">
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
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
                {settingsSuccess}
              </div>
            )}

            {settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : settings && (
              <>
                {/* Verification Rules */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
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
                      checked={settings.verificationRules.requireIdCard}
                      onChange={(checked) => updateVerificationRule('requireIdCard', checked)}
                      disabled={!settings.verificationRules.requireSelfie}
                    />
                    <ToggleSwitch
                      label={t('settings.require_selfie')}
                      description={t('settings.require_selfie_desc')}
                      checked={settings.verificationRules.requireSelfie}
                      onChange={(checked) => updateVerificationRule('requireSelfie', checked)}
                      disabled={!settings.verificationRules.requireIdCard}
                    />
                    
                    {/* Warning if only one is selected */}
                    {(!settings.verificationRules.requireIdCard || !settings.verificationRules.requireSelfie) && (
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
                <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
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
                      value={settings.thresholds.fullNameConfidence}
                      onChange={(val) => updateThreshold('fullNameConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds.fullNameConfidence}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_id_confidence')}
                      value={settings.thresholds.identityNumberConfidence}
                      onChange={(val) => updateThreshold('identityNumberConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds.identityNumberConfidence}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_dob_confidence')}
                      value={settings.thresholds.dateOfBirthConfidence}
                      onChange={(val) => updateThreshold('dateOfBirthConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds.dateOfBirthConfidence}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_expiry_confidence')}
                      value={settings.thresholds.expiryDateConfidence}
                      onChange={(val) => updateThreshold('expiryDateConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds.expiryDateConfidence}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_image_quality')}
                      value={settings.thresholds.imageQuality}
                      onChange={(val) => updateThreshold('imageQuality', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds.imageQuality}
                      format="percent"
                    />
                  </div>
                </div>

                {/* Thresholds - Selfie Verification */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('settings.selfie_thresholds')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.selfie_thresholds_desc')}</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ThresholdSlider
                      label={t('settings.th_match_confidence')}
                      value={settings.thresholds.matchConfidence}
                      onChange={(val) => updateThreshold('matchConfidence', val)}
                      min={0}
                      max={100}
                      step={5}
                      defaultValue={defaults?.thresholds.matchConfidence}
                      format="number"
                      suffix="%"
                    />
                    <ThresholdSlider
                      label={t('settings.th_face_detection')}
                      value={settings.thresholds.faceDetectionConfidence}
                      onChange={(val) => updateThreshold('faceDetectionConfidence', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds.faceDetectionConfidence}
                      format="percent"
                    />
                    <ThresholdSlider
                      label={t('settings.th_spoofing_max')}
                      value={settings.thresholds.spoofingRiskMax}
                      onChange={(val) => updateThreshold('spoofingRiskMax', val)}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={defaults?.thresholds.spoofingRiskMax}
                      format="percent"
                      inverse
                    />
                  </div>
                </div>

                {/* Thresholds - Age */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
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
                      value={settings.thresholds.minAge}
                      onChange={(val) => updateThreshold('minAge', val)}
                      min={0}
                      max={100}
                      step={1}
                      defaultValue={defaults?.thresholds.minAge}
                      format="number"
                      suffix={` ${t('settings.years')}`}
                    />
                    <ThresholdSlider
                      label={t('settings.th_max_age')}
                      value={settings.thresholds.maxAge}
                      onChange={(val) => updateThreshold('maxAge', val)}
                      min={50}
                      max={150}
                      step={1}
                      defaultValue={defaults?.thresholds.maxAge}
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
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
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
    gray: 'text-gray-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400'
  };

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors duration-200">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-white">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const config = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    failed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config[status] || config.pending}`}>
      {status}
    </span>
  );
};

const ToggleSwitch = ({ label, description, checked, onChange, disabled }) => (
  <div className={`flex items-center justify-between p-4 rounded-lg border ${disabled ? 'opacity-50' : ''} ${
    checked ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
  }`}>
    <div className="flex-1">
      <p className="font-medium text-gray-900 dark:text-white">{label}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
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
        <span className={`text-sm font-semibold ${isGood ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
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
          background: `linear-gradient(to right, ${isGood ? '#22c55e' : '#f97316'} 0%, ${isGood ? '#22c55e' : '#f97316'} ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
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
