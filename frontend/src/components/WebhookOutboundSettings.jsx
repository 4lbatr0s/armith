import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { apiService } from '../services/api';
import { notify } from '../lib/notify';
import { WEBHOOK_OPTIONAL_DATA_FIELDS_FALLBACK } from '../constants/webhookOptionalDataFields';
import {
  MANUAL_REVIEW_RESOLVED_BODY_EXAMPLE,
  TERMINAL_WEBHOOK_BODY_EXAMPLE
} from '../constants/webhookPayloadExamples';

const WEBHOOK_EVENT_ORDER = [
  'verification.manual_review_queued',
  'verification.manual_review_resolved',
  'verification.completed',
  'verification.failed'
];

const EVENT_LABEL_KEYS = {
  verification_manual_review_queued: 'settings.integration_webhook_event_label_manual_queued',
  verification_manual_review_resolved: 'settings.integration_webhook_event_label_manual_resolved',
  verification_completed: 'settings.integration_webhook_event_label_completed',
  verification_failed: 'settings.integration_webhook_event_label_failed'
};

function webhookEventLabelKey(evt) {
  const k = evt.replace(/\./g, '_');
  return EVENT_LABEL_KEYS[k];
}

function webhookEventDescKey(evt) {
  const k = evt.replace(/\./g, '_');
  const map = {
    verification_manual_review_queued: 'integrations.event_manual_review_queued_body',
    verification_manual_review_resolved: 'integrations.event_manual_review_resolved_body',
    verification_completed: 'integrations.event_completed_body',
    verification_failed: 'integrations.event_failed_body'
  };
  return map[k];
}

function mapIntegration(rawSettings) {
  const int = rawSettings?.integration;
  if (!int || typeof int !== 'object') {
    return {
      webhookUrl: '',
      hasWebhookSecret: false,
      webhookEvents: [...WEBHOOK_EVENT_ORDER],
      webhookDataFields: [],
      webhookDataFieldCatalog: [...WEBHOOK_OPTIONAL_DATA_FIELDS_FALLBACK]
    };
  }
  const rawEvents = int.webhookEvents;
  const webhookEvents = Array.isArray(rawEvents) ? [...rawEvents] : [...WEBHOOK_EVENT_ORDER];
  const rawDataFields = int.webhookDataFields;
  const webhookDataFields = Array.isArray(rawDataFields) ? [...rawDataFields] : [];
  const cat = int.webhookDataFieldCatalog;
  const webhookDataFieldCatalog = Array.isArray(cat)
    ? [...cat]
    : [...WEBHOOK_OPTIONAL_DATA_FIELDS_FALLBACK];
  return {
    webhookUrl: typeof int.webhookUrl === 'string' ? int.webhookUrl : '',
    hasWebhookSecret: Boolean(int.hasWebhookSecret),
    webhookEvents,
    webhookDataFields,
    webhookDataFieldCatalog
  };
}

/** Tenant outbound webhook via GET/PUT `/admin/settings` → `integration`. */
export function WebhookOutboundSettings({ disableActions = false }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({
    webhookUrl: '',
    hasWebhookSecret: false,
    webhookEvents: [...WEBHOOK_EVENT_ORDER],
    webhookDataFields: [],
    webhookDataFieldCatalog: [...WEBHOOK_OPTIONAL_DATA_FIELDS_FALLBACK]
  }));
  const [secretDraft, setSecretDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const hydrate = useCallback((rawSettings) => {
    setForm(mapIntegration(rawSettings));
  }, []);

  const dataFieldCatalog = useMemo(() => form.webhookDataFieldCatalog ?? [], [form.webhookDataFieldCatalog]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiService.getSettings();
        if (!cancelled && data?.settings) hydrate(data.settings);
      } catch (_) {
        if (!cancelled) setError(t('settings.load_error'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, hydrate]);

  const toggleWebhookEvent = (evt) => {
    setForm((prev) => {
      const cur = new Set(prev.webhookEvents || []);
      if (cur.has(evt)) cur.delete(evt);
      else cur.add(evt);
      return {
        ...prev,
        webhookEvents: WEBHOOK_EVENT_ORDER.filter((e) => cur.has(e))
      };
    });
  };

  const toggleWebhookDataField = (fieldId) => {
    setForm((prev) => {
      const catalog = prev.webhookDataFieldCatalog ?? [];
      const allowed = new Set(catalog.length ? catalog : WEBHOOK_OPTIONAL_DATA_FIELDS_FALLBACK);
      if (!allowed.has(fieldId)) return prev;
      const cur = new Set(prev.webhookDataFields || []);
      if (cur.has(fieldId)) cur.delete(fieldId);
      else cur.add(fieldId);
      const stableOrder = (catalog.length ? catalog : [...WEBHOOK_OPTIONAL_DATA_FIELDS_FALLBACK]).filter((f) =>
        cur.has(f)
      );
      return { ...prev, webhookDataFields: stableOrder };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        integration: {
          webhookUrl: (form.webhookUrl ?? '').trim(),
          webhookEvents: [...(form.webhookEvents || [])],
          webhookDataFields: [...(form.webhookDataFields || [])]
        }
      };
      const trimmed = secretDraft.trim();
      if (trimmed) payload.integration.webhookSecret = trimmed;
      const data = await apiService.updateSettings(payload);
      if (data?.settings) hydrate(data.settings);
      setSecretDraft('');
      notify.success(t('settings.integration_webhook_saved'));
    } catch (err) {
      setError(err.message || t('settings.save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleClearSecret = async () => {
    if (!window.confirm(t('settings.integration_webhook_clear_confirm'))) return;
    try {
      setSaving(true);
      setError(null);
      const data = await apiService.updateSettings({ integration: { webhookSecret: '' } });
      if (data?.settings) hydrate(data.settings);
      setSecretDraft('');
      notify.success(t('settings.integration_webhook_saved'));
    } catch (err) {
      setError(err.message || t('settings.save_error'));
    } finally {
      setSaving(false);
    }
  };

  const stepClass =
    'rounded-sm border border-pm-ink/12 dark:border-white/15 bg-pm-wash/20 dark:bg-pm-void/40 px-4 py-4 space-y-3';

  return (
    <div className="rounded-sm border-2 border-pm-ink/15 dark:border-white/20 px-4 py-5 space-y-6">
      {error && (
        <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-3 py-2 text-sm">{error}</div>
      )}

      <div>
        <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">
          {t('settings.integration_webhook_title')}
        </h3>
        <p className="text-sm text-pm-muted mt-1">{t('settings.integration_webhook_desc')}</p>
      </div>

      {/* Step 1 */}
      <div className={stepClass}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pm-accent-alt">
          {t('settings.integration_webhook_step_1')}
        </p>
        <label className="block text-xs uppercase tracking-widest text-pm-muted mb-1">
          {t('settings.integration_webhook_url_label')}
        </label>
        <input
          type="url"
          value={form.webhookUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, webhookUrl: e.target.value }))}
          placeholder="https://api.example.com/webhooks/kyc"
          disabled={disableActions || saving}
          className="w-full px-3 py-2 border rounded-sm bg-pm-surface dark:bg-pm-surface-dark text-pm-ink dark:text-pm-ink-soft border-pm-ink/20 dark:border-white/20 disabled:opacity-60"
        />
      </div>

      {/* Step 2 */}
      <div className={stepClass}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pm-accent-alt">
          {t('settings.integration_webhook_step_2')}
        </p>
        <p className="text-xs font-semibold uppercase tracking-wide text-pm-muted">
          {form.hasWebhookSecret
            ? t('settings.integration_webhook_secret_set')
            : t('settings.integration_webhook_secret_missing')}
        </p>
        <label className="block text-xs uppercase tracking-widest text-pm-muted mb-1">
          {t('settings.integration_webhook_secret_label')}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          value={secretDraft}
          onChange={(e) => setSecretDraft(e.target.value)}
          placeholder={t('settings.integration_webhook_secret_placeholder')}
          disabled={disableActions || saving}
          className="w-full px-3 py-2 border rounded-sm bg-pm-surface dark:bg-pm-surface-dark text-pm-ink dark:text-pm-ink-soft font-mono text-sm border-pm-ink/20 dark:border-white/20 disabled:opacity-60"
        />
      </div>

      {/* Step 3 */}
      <div className={stepClass}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pm-accent-alt">
          {t('settings.integration_webhook_step_3')}
        </p>
        <p className="text-xs uppercase tracking-widest text-pm-muted">{t('settings.integration_webhook_events_label')}</p>
        <p className="text-xs text-pm-muted mb-3">{t('settings.integration_webhook_events_hint_short')}</p>
        <ul className="space-y-4">
          {WEBHOOK_EVENT_ORDER.map((evt) => {
            const labelKey = webhookEventLabelKey(evt);
            const descKey = webhookEventDescKey(evt);
            return (
              <li key={evt} className="border-l-4 border-pm-ink/20 dark:border-white/25 pl-3">
                <label className="flex gap-3 items-start cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    checked={form.webhookEvents.includes(evt)}
                    onChange={() => toggleWebhookEvent(evt)}
                    disabled={disableActions || saving}
                  />
                  <span>
                    <span className="font-semibold text-sm text-pm-ink dark:text-pm-ink-soft block">
                      {labelKey ? t(labelKey) : evt}
                    </span>
                    <span className="font-mono text-[10px] text-pm-muted block mt-0.5">{evt}</span>
                    {descKey ? (
                      <span className="text-sm text-pm-muted leading-snug block mt-1">{t(descKey)}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="pt-5 border-t border-pm-ink/10 dark:border-white/15 mt-4">
          <p className="text-xs uppercase tracking-widest text-pm-muted">{t('settings.integration_webhook_data_fields_heading')}</p>
          <p className="text-xs text-pm-muted mb-3 mt-1">{t('settings.integration_webhook_data_fields_hint')}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(dataFieldCatalog.length ? dataFieldCatalog : WEBHOOK_OPTIONAL_DATA_FIELDS_FALLBACK).map((fieldId) => {
              const labelKey = `settings.integration_webhook_field_${fieldId.replace(/\./g, '_')}`;
              return (
                <li key={fieldId}>
                  <label className="flex gap-2 items-start cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      checked={(form.webhookDataFields || []).includes(fieldId)}
                      onChange={() => toggleWebhookDataField(fieldId)}
                      disabled={disableActions || saving}
                    />
                    <span>
                      <span className="text-sm font-medium text-pm-ink dark:text-pm-ink-soft block">{t(labelKey)}</span>
                      <span className="font-mono text-[10px] text-pm-muted">{fieldId}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={disableActions || saving}>
          {saving ? t('settings.saving') : t('settings.integration_webhook_save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleClearSecret}
          disabled={disableActions || saving || !form.hasWebhookSecret}
        >
          {t('settings.integration_webhook_clear_secret')}
        </Button>
      </div>

      <details className="rounded-sm border border-pm-ink/12 dark:border-white/15 px-4 py-3 text-sm bg-pm-wash/15 dark:bg-pm-void/30">
        <summary className="cursor-pointer font-bold text-pm-ink dark:text-pm-ink-soft select-none">
          {t('settings.integration_webhook_dev_details')}
        </summary>
        <div className="mt-4 space-y-4 text-pm-muted">
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-pm-ink/70 dark:text-pm-ink-soft/80 mb-1">
              {t('settings.integration_webhook_headers_title')}
            </p>
            <ul className="list-disc ml-5 space-y-1 text-xs">
              <li>{t('settings.integration_webhook_header_content_type')}</li>
              <li>{t('settings.integration_webhook_header_timestamp')}</li>
              <li>{t('settings.integration_webhook_header_signature')}</li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-pm-ink/70 dark:text-pm-ink-soft/80 mb-1">
              {t('settings.integration_webhook_delivery_id')}
            </p>
            <p className="text-xs leading-relaxed">{t('settings.integration_webhook_delivery_id_body')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-pm-ink/70 dark:text-pm-ink-soft/80 mb-1">
              {t('integrations.replay_note_title')}
            </p>
            <p className="text-xs leading-relaxed">{t('integrations.replay_note')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-pm-ink/70 dark:text-pm-ink-soft/80 mb-1">
              {t('settings.integration_webhook_example_terminal')}
            </p>
            <pre className="text-[11px] font-mono overflow-x-auto whitespace-pre-wrap p-3 rounded-sm bg-pm-surface dark:bg-pm-surface-dark border border-pm-ink/10">
              {TERMINAL_WEBHOOK_BODY_EXAMPLE}
            </pre>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-pm-ink/70 dark:text-pm-ink-soft/80 mb-1">
              {t('settings.integration_webhook_example_resolved')}
            </p>
            <pre className="text-[11px] font-mono overflow-x-auto whitespace-pre-wrap p-3 rounded-sm bg-pm-surface dark:bg-pm-surface-dark border border-pm-ink/10">
              {MANUAL_REVIEW_RESOLVED_BODY_EXAMPLE}
            </pre>
          </div>
          <p className="text-xs leading-relaxed">{t('settings.integration_webhook_external_ref_hint')}</p>
        </div>
      </details>
    </div>
  );
}
