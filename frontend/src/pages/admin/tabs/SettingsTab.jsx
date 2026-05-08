import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ToggleSwitch } from '../../../components/admin/ToggleSwitch';
import { ThresholdSlider } from '../../../components/admin/ThresholdSlider';
import { Skeleton } from '../../../components/ui/Skeleton';

export function SettingsTab({
  t,
  settingsError,
  settingsLoading,
  settings,
  setSettings,
  defaults,
  fetchSettings,
  settingsSaving,
  handleSaveSettings,
  handleResetSettings,
  updateVerificationRule,
  updateThreshold,
}) {
  const navigate = useNavigate();
  return (
    <div role="tabpanel" id="admin-tabpanel-settings" aria-labelledby="admin-tab-settings">
<div className="space-y-6">
  {/* Messages */}
  {settingsError && (
    <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3 text-pm-ink dark:text-pm-ink-soft">
      {settingsError}
    </div>
  )}
  {settingsLoading ? (
    <div className="space-y-4 py-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
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
          <Button type="button" variant="outline" className="border-2" onClick={() => navigate('/integrations?tab=api-keys')}>
            {t('settings.integration_moved_keys_cta')}
          </Button>
        </div>
      </div>
      {/* Verification Rules */}
      <div className="pm-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-pm-ink/15 dark:border-white/15">
          <h3 className="text-lg font-semibold text-pm-ink dark:text-pm-ink-soft flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {t('settings.verification_rules')}
          </h3>
          <p className="text-sm text-pm-muted mt-1">{t('settings.verification_rules_desc')}</p>
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
        <div className="px-6 py-4 border-b border-pm-ink/15 dark:border-white/15">
          <h3 className="text-lg font-semibold text-pm-ink dark:text-pm-ink-soft flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            {t('settings.id_thresholds')}
          </h3>
          <p className="text-sm text-pm-muted mt-1">{t('settings.id_thresholds_desc')}</p>
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
              updateThreshold('idMinImageQuality', val);
              updateThreshold('imageQuality', val);
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
        <div className="px-6 py-4 border-b border-pm-ink/15 dark:border-white/15">
          <h3 className="text-lg font-semibold text-pm-ink dark:text-pm-ink-soft flex items-center">
            <svg className="w-5 h-5 mr-2 text-pm-accent-alt" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('settings.selfie_thresholds')}
          </h3>
          <p className="text-sm text-pm-muted mt-1">{t('settings.selfie_thresholds_desc')}</p>
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
        <div className="px-6 py-4 border-b border-pm-ink/15 dark:border-white/15">
          <h3 className="text-lg font-semibold text-pm-ink dark:text-pm-ink-soft flex items-center">
            <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t('settings.age_constraints')}
          </h3>
          <p className="text-sm text-pm-muted mt-1">{t('settings.age_constraints_desc')}</p>
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
          className="border-pm-ink/25 dark:border-white/25 text-pm-ink dark:text-pm-ink-soft"
        >
          {t('settings.reset_defaults')}
        </Button>
        <div className="flex gap-3">
          <Button
            onClick={fetchSettings}
            variant="outline"
            disabled={settingsSaving}
            className="border-pm-ink/25 dark:border-white/25"
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
        <p className="text-center text-sm text-pm-muted">
          {t('settings.last_updated')}: {new Date(settings.metadata.lastUpdated).toLocaleString()}
        </p>
      )}
    </>
  )}
</div>
    </div>
  );
}
