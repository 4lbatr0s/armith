import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { apiService } from '../services/api';
import { notify } from '../lib/notify';

const WEBHOOK_EVENT_ORDER = [
  'verification.manual_review_queued',
  'verification.manual_review_resolved',
  'verification.completed',
  'verification.failed'
];

const EVENT_DESC_KEYS = {
  verification_manual_review_queued: 'integrations.event_manual_review_queued_body',
  verification_manual_review_resolved: 'integrations.event_manual_review_resolved_body',
  verification_completed: 'integrations.event_completed_body',
  verification_failed: 'integrations.event_failed_body'
};

function webhookEventDescKey(evt) {
  const k = evt.replace(/\./g, '_');
  return EVENT_DESC_KEYS[k];
}

function mapIntegration(rawSettings) {
  const int = rawSettings?.integration;
  if (!int || typeof int !== 'object') {
    return { webhookUrl: '', hasWebhookSecret: false, webhookEvents: [...WEBHOOK_EVENT_ORDER] };
  }
  const rawEvents = int.webhookEvents;
  const webhookEvents = Array.isArray(rawEvents) ? [...rawEvents] : [...WEBHOOK_EVENT_ORDER];
  return {
    webhookUrl: typeof int.webhookUrl === 'string' ? int.webhookUrl : '',
    hasWebhookSecret: Boolean(int.hasWebhookSecret),
    webhookEvents
  };
}

/** Tenant outbound webhook URL + signing secret via GET/PUT `/admin/settings` → `integration`. */
export function WebhookOutboundSettings({ disableActions = false }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({
    webhookUrl: '',
    hasWebhookSecret: false,
    webhookEvents: [...WEBHOOK_EVENT_ORDER]
  }));
  const [secretDraft, setSecretDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const hydrate = useCallback((rawSettings) => {
    setForm(mapIntegration(rawSettings));
  }, []);

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

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        integration: {
          webhookUrl: (form.webhookUrl ?? '').trim(),
          webhookEvents: [...(form.webhookEvents || [])]
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

  return (
    <div className="rounded-sm border-2 border-pm-ink/15 dark:border-white/20 px-4 py-5 space-y-4">
      {error && <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-3 py-2 text-sm">{error}</div>}
      <div>
        <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">
          {t('settings.integration_webhook_title')}
        </h3>
        <p className="text-sm text-pm-muted mt-1">{t('settings.integration_webhook_desc')}</p>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-pm-muted">
        {form.hasWebhookSecret
          ? t('settings.integration_webhook_secret_set')
          : t('settings.integration_webhook_secret_missing')}
      </p>
      <div>
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
      <div>
        <p className="text-xs uppercase tracking-widest text-pm-muted mb-1">
          {t('settings.integration_webhook_events_label')}
        </p>
        <p className="text-xs text-pm-muted mb-2">{t('settings.integration_webhook_events_hint')}</p>
        <ul className="space-y-3">
          {WEBHOOK_EVENT_ORDER.map((evt) => {
            const descKey = webhookEventDescKey(evt);
            return (
              <li key={evt}>
                <label className="flex gap-3 items-start cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    checked={form.webhookEvents.includes(evt)}
                    onChange={() => toggleWebhookEvent(evt)}
                    disabled={disableActions || saving}
                  />
                  <span>
                    <span className="font-mono text-[11px] font-bold text-pm-ink dark:text-pm-ink-soft block">
                      {evt}
                    </span>
                    {descKey ? (
                      <span className="text-sm text-pm-muted leading-snug block mt-0.5">{t(descKey)}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
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
    </div>
  );
}
