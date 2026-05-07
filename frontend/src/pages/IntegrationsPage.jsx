import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WebhookOutboundSettings } from '../components/WebhookOutboundSettings';
import { Button } from '../components/ui/button';

export const IntegrationsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 w-full py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <span className="pm-kicker mb-3 inline-block text-[10px]">{t('integrations.kicker')}</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-pm-ink dark:text-pm-ink-soft mb-4">
            {t('integrations.title')}
          </h1>
          <p className="text-lg text-pm-muted leading-relaxed border-l-4 border-pm-accent-alt pl-4">
            {t('integrations.lead')}
          </p>
        </div>

        <section className="pm-panel px-6 py-6 space-y-5 border-t-4 border-pm-accent-alt">
          <h2 className="font-display text-xl font-bold text-pm-ink dark:text-pm-ink-soft">{t('integrations.when_heading')}</h2>
          <p className="text-sm text-pm-muted leading-relaxed">{t('integrations.when_intro')}</p>

          <div className="space-y-4 text-sm leading-relaxed">
            <div>
              <p className="font-mono text-xs font-bold text-pm-ink dark:text-pm-ink-soft mb-1">{t('integrations.event_manual_review_queued_type')}</p>
              <p className="text-pm-muted">{t('integrations.event_manual_review_queued_body')}</p>
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-pm-ink dark:text-pm-ink-soft mb-1">{t('integrations.event_completed_type')}</p>
              <p className="text-pm-muted">{t('integrations.event_completed_body')}</p>
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-pm-ink dark:text-pm-ink-soft mb-1">{t('integrations.event_failed_type')}</p>
              <p className="text-pm-muted">{t('integrations.event_failed_body')}</p>
            </div>
          </div>

          <div className="rounded-sm border border-pm-ink/15 dark:border-white/15 bg-pm-wash/30 dark:bg-pm-void/50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-pm-muted mb-1">{t('integrations.when_not_heading')}</p>
            <p className="text-sm text-pm-muted">{t('integrations.when_not_body')}</p>
          </div>

          <p className="text-xs text-pm-muted">{t('integrations.replay_note')}</p>
        </section>

        <WebhookOutboundSettings />

        <div className="pm-panel px-6 py-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="font-display font-bold text-pm-ink dark:text-pm-ink-soft">{t('integrations.api_keys_title')}</p>
            <p className="text-sm text-pm-muted mt-1 max-w-xl">{t('integrations.api_keys_desc')}</p>
          </div>
          <Button type="button" variant="outline" className="shrink-0 border-2 border-pm-ink/20" asChild>
            <Link to="/profile?tab=security">{t('integrations.go_profile_security')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
