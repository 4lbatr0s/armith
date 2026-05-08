import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WebhookOutboundSettings } from '../components/WebhookOutboundSettings';
import { ApiKeysPanel } from '../components/ApiKeysPanel';

const TAB_KEYS = ['webhooks', 'api-keys'];

function normalizeIntegrationTab(raw) {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return TAB_KEYS.includes(v) ? v : 'webhooks';
}

export const IntegrationsPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(() => normalizeIntegrationTab(searchParams.get('tab')), [searchParams]);

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw == null || raw === '') return;
    const key = normalizeIntegrationTab(raw);
    if (key === raw) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (key === 'webhooks') next.delete('tab');
        else next.set('tab', key);
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  const setTab = (tab) => {
    const key = normalizeIntegrationTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (key === 'webhooks') next.delete('tab');
        else next.set('tab', key);
        return next;
      },
      { replace: true }
    );
  };

  return (
    <div className="flex-1 w-full py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <span className="pm-kicker mb-3 inline-block text-[10px]">{t('integrations.kicker')}</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-pm-ink dark:text-pm-ink-soft mb-4">
            {t('integrations.title')}
          </h1>
          <p className="text-lg text-pm-muted leading-relaxed border-l-4 border-pm-accent-alt pl-4">
            {t('integrations.lead_compact')}
          </p>
        </div>

        <div className="flex flex-wrap border-2 border-pm-ink dark:border-white/20 rounded-sm overflow-hidden shadow-brutal max-w-xl">
          <button
            type="button"
            onClick={() => setTab('webhooks')}
            className={`flex-1 min-w-[9rem] px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === 'webhooks'
                ? 'bg-pm-accent text-white'
                : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
            }`}
          >
            {t('integrations.tab_webhooks')}
          </button>
          <button
            type="button"
            onClick={() => setTab('api-keys')}
            className={`flex-1 min-w-[9rem] px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-l-2 border-pm-ink dark:border-white/20 transition-colors ${
              activeTab === 'api-keys'
                ? 'bg-pm-accent text-white'
                : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
            }`}
          >
            {t('integrations.tab_api_keys')}
          </button>
        </div>

        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <WebhookOutboundSettings />
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div className="pm-panel px-6 py-6 space-y-6 border-t-4 border-pm-ink/20">
            <div>
              <h2 className="font-display text-xl font-bold text-pm-ink dark:text-pm-ink-soft">
                {t('integrations.api_keys_heading')}
              </h2>
              <p className="text-sm text-pm-muted mt-2 leading-relaxed">{t('integrations.api_keys_tab_desc')}</p>
            </div>
            <ApiKeysPanel />
          </div>
        )}
      </div>
    </div>
  );
};
