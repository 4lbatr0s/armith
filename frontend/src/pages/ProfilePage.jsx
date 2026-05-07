import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';

function splitAllowlistInput(text) {
  const chunks = [];
  for (const part of String(text ?? '').split(/[\n,;]+/)) {
    for (const s of part.trim().split(/\s+/)) {
      if (s) chunks.push(s);
    }
  }
  return chunks;
}

function isSecurityQueryTab(searchParams) {
  const raw = searchParams.get('tab');
  if (typeof raw !== 'string') return false;
  const v = raw.trim().toLowerCase();
  return v === 'security' || v === 'integration';
}

export const ProfilePage = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    isSecurityQueryTab(searchParams) ? 'security' : 'account'
  );
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage] = useState(null);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyToken, setApiKeyToken] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedAllowlistKey, setExpandedAllowlistKey] = useState(null);
  const [allowlistDraft, setAllowlistDraft] = useState('');

  useEffect(() => {
    if (isSecurityQueryTab(searchParams)) setActiveTab('security');
  }, [searchParams]);

  const goAccountTab = useCallback(() => {
    setActiveTab('account');
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('tab');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const goSecurityTab = useCallback(() => {
    setActiveTab('security');
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'security');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const loadApiKeys = useCallback(async () => {
    try {
      setApiKeysLoading(true);
      const [keysData, profileData] = await Promise.all([
        apiService.getApiKeys(),
        apiService.getProfile()
      ]);
      setApiKeys(keysData.apiKeys || []);
      const profileUser = profileData?.data?.user;
      if (profileUser) {
        const limit = profileUser?.limitsOverride?.monthlyVerificationLimit ?? (
          profileUser?.planTier === 'growth'
            ? 5000
            : profileUser?.planTier === 'enterprise'
              ? null
              : 100
        );
        const used = profileUser?.verificationUsage?.currentPeriodCount || 0;
        const remaining = limit == null ? null : Math.max(limit - used, 0);
        setUsage({
          planTier: profileUser.planTier || 'free',
          used,
          limit,
          remaining
        });
      }
    } catch (err) {
      setError(err.message || t('profile.security.load_error'));
    } finally {
      setApiKeysLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab === 'security') {
      loadApiKeys();
    }
  }, [activeTab, loadApiKeys]);

  const handleCreateApiKey = async () => {
    const trimmedName = apiKeyName.trim();
    if (!trimmedName) {
      setError(t('profile.security.name_required'));
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const data = await apiService.createApiKey(trimmedName);
      setApiKeyName('');
      setApiKeyToken(data.token);
      await loadApiKeys();
      setMessage(t('profile.security.create_success'));
    } catch (err) {
      setError(err.message || t('profile.security.create_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeApiKey = async (id) => {
    if (!window.confirm(t('profile.security.revoke_confirm'))) return;

    try {
      setSaving(true);
      setError(null);
      await apiService.revokeApiKey(id);
      setApiKeys((prev) => prev.map((key) => (key.id === id ? { ...key, revokedAt: new Date().toISOString() } : key)));
      setMessage(t('profile.security.revoke_success'));
    } catch (err) {
      setError(err.message || t('profile.security.revoke_error'));
    } finally {
      setSaving(false);
    }
  };

  const openAllowlistEditor = (item) => {
    const list = Array.isArray(item.allowedCidrs) ? item.allowedCidrs : [];
    setAllowlistDraft(list.join('\n'));
    setExpandedAllowlistKey(item.id);
    setMessage(null);
    setError(null);
  };

  const saveAllowlist = async (keyId) => {
    try {
      setSaving(true);
      setError(null);
      const lines = splitAllowlistInput(allowlistDraft);
      await apiService.updateApiKeyAllowlist(keyId, lines);
      setExpandedAllowlistKey(null);
      setMessage(t('profile.security.allowlist_saved'));
      await loadApiKeys();
    } catch (err) {
      setError(err.message || t('profile.security.allowlist_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 w-full py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 border-b-2 border-pm-ink/10 dark:border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="pm-kicker mb-2 inline-block text-[10px]">{t('profile.title')}</span>
            <h1 className="font-display text-3xl font-bold tracking-tight text-pm-ink dark:text-pm-ink-soft">
              {t('profile.title')}
            </h1>
          </div>
          <div className="flex border-2 border-pm-ink dark:border-white/20 rounded-sm overflow-hidden shadow-brutal">
            <button
              type="button"
              onClick={goAccountTab}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${
                activeTab === 'account'
                  ? 'bg-pm-accent text-white'
                  : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted'
              }`}
            >
              {t('profile.account.title')}
            </button>
            <button
              type="button"
              onClick={goSecurityTab}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-l-2 border-pm-ink dark:border-white/20 ${
                activeTab === 'security'
                  ? 'bg-pm-accent text-white'
                  : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted'
              }`}
            >
              {t('profile.security.title')}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3">{error}</div>}
        {message && <div className="mb-4 rounded-sm border-2 border-pm-accent-alt/40 bg-pm-accent-alt/10 px-4 py-3">{message}</div>}

        {activeTab === 'account' && (
          <div className="pm-panel p-6 space-y-4">
            <h2 className="font-display text-xl font-bold">{t('profile.account.title')}</h2>
            <p className="text-sm text-pm-muted">{t('profile.account.description')}</p>
            <div className="rounded-sm border-2 border-pm-ink/10 dark:border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-sm text-pm-muted">{t('profile.account.security_here_hint')}</p>
              <Button type="button" variant="outline" className="shrink-0" onClick={goSecurityTab}>
                {t('profile.account.open_security_tab')}
              </Button>
            </div>
            <div className="rounded-sm border-2 border-pm-ink/10 dark:border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-sm text-pm-muted">{t('profile.account.webhook_here_hint')}</p>
              <Button type="button" variant="outline" className="shrink-0" asChild>
                <Link to="/integrations">{t('profile.account.open_integrations')}</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-pm-muted">{t('profile.account.name')}</p>
                <p className="font-semibold">{user?.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-pm-muted">{t('profile.account.email')}</p>
                <p className="font-semibold">{user?.primaryEmailAddress?.emailAddress || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="pm-panel p-6 space-y-5">
            <h2 className="font-display text-xl font-bold">{t('profile.security.title')}</h2>
            <p className="text-sm text-pm-muted">{t('profile.security.description')}</p>
            <p className="text-sm text-pm-muted border-l-4 border-pm-ink/20 dark:border-white/20 pl-3 py-1">
              {t('profile.security.tabs_hint')}
            </p>

            <div className="rounded-sm border-2 border-pm-ink/15 dark:border-white/20 bg-pm-wash/30 dark:bg-pm-void/50 px-4 py-4 text-sm space-y-2">
              <p className="font-display font-bold text-pm-ink dark:text-pm-ink-soft">{t('profile.security.rotation_heading')}</p>
              <p className="text-pm-muted">{t('profile.security.rotation_intro')}</p>
              <ul className="list-disc list-inside text-pm-muted space-y-1">
                <li>{t('profile.security.rotation_keys')}</li>
                <li>{t('profile.security.rotation_webhook')}</li>
              </ul>
              <p className="text-xs uppercase tracking-widest text-pm-muted">{t('profile.security.rotation_doc_hint')}</p>
            </div>

            <div className="rounded-sm border-2 border-pm-ink/15 dark:border-white/20 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <p className="font-display font-bold text-pm-ink dark:text-pm-ink-soft">{t('profile.security.webhook_moved_title')}</p>
                <p className="text-sm text-pm-muted mt-1">{t('profile.security.webhook_moved_desc')}</p>
              </div>
              <Button type="button" variant="outline" className="shrink-0 border-2" asChild>
                <Link to="/integrations">{t('profile.security.open_integrations')}</Link>
              </Button>
            </div>

            {usage && (
              <div className="rounded-sm border-2 border-pm-ink/15 dark:border-white/20 bg-pm-wash/40 dark:bg-pm-void/60 px-4 py-3 text-sm">
                <p className="font-semibold">
                  {t('profile.security.usage_plan')}: {usage.planTier}
                </p>
                <p>
                  {t('profile.security.usage_used')}: {usage.used}
                </p>
                <p>
                  {t('profile.security.usage_limit')}: {usage.limit == null ? t('profile.security.unlimited') : usage.limit}
                </p>
                <p>
                  {t('profile.security.usage_remaining')}: {usage.remaining == null ? t('profile.security.unlimited') : usage.remaining}
                </p>
              </div>
            )}

            {apiKeyToken && (
              <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 p-4">
                <p className="text-xs uppercase tracking-widest text-pm-muted mb-2">{t('profile.security.one_time')}</p>
                <code className="block overflow-x-auto text-sm">{apiKeyToken}</code>
                <Button className="mt-3" variant="outline" onClick={() => navigator.clipboard.writeText(apiKeyToken)}>
                  {t('profile.security.copy')}
                </Button>
              </div>
            )}

            <div id="profile-api-keys">
              <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft mb-2 scroll-mt-24">
                {t('settings.api_keys_title')}
              </h3>
              {!apiKeysLoading && apiKeys.length === 0 ? (
                <p className="text-sm text-pm-muted mb-3">{t('profile.security.api_keys_where_allowlist')}</p>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
                placeholder={t('profile.security.name_placeholder')}
                className="flex-1 px-3 py-2 border rounded-sm bg-white dark:bg-gray-900 dark:text-white"
                maxLength={100}
              />
              <Button onClick={handleCreateApiKey} disabled={saving}>
                {t('profile.security.create')}
              </Button>
            </div>

            {apiKeysLoading ? (
              <p className="text-sm text-pm-muted">{t('common.loading')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-pm-ink/10 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('profile.security.key_name')}</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('profile.security.key_prefix')}</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('profile.security.created')}</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('profile.security.last_used')}</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('profile.security.status')}</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-widest text-pm-muted">{t('profile.security.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pm-ink/10 dark:divide-white/10">
                    {apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-3 py-4 text-sm text-pm-muted">{t('profile.security.empty')}</td>
                      </tr>
                    ) : (
                      apiKeys.map((item) => (
                        <Fragment key={item.id}>
                          <tr>
                            <td className="px-3 py-3 text-sm font-semibold">{item.name}</td>
                            <td className="px-3 py-3 text-sm font-mono text-pm-muted">{item.prefix}</td>
                            <td className="px-3 py-3 text-sm text-pm-muted">{new Date(item.createdAt).toLocaleString()}</td>
                            <td className="px-3 py-3 text-sm text-pm-muted">{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : '-'}</td>
                            <td className="px-3 py-3 text-sm text-pm-muted">
                              {item.revokedAt ? (
                                t('profile.security.revoked')
                              ) : (
                                <>
                                  <span>{t('profile.security.active')}</span>
                                  {Array.isArray(item.allowedCidrs) && item.allowedCidrs.length > 0 ? (
                                    <span className="block mt-1 text-[10px] uppercase tracking-wide text-pm-accent">
                                      {t('profile.security.allowlist_count', { count: item.allowedCidrs.length })}
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {!item.revokedAt && (
                                <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                                  <Button variant="outline" onClick={() => openAllowlistEditor(item)} disabled={saving}>
                                    {t('profile.security.allowlist_edit')}
                                  </Button>
                                  <Button variant="outline" onClick={() => handleRevokeApiKey(item.id)} disabled={saving}>
                                    {t('profile.security.revoke')}
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                          {!item.revokedAt && expandedAllowlistKey === item.id ? (
                            <tr>
                              <td colSpan={6} className="px-3 pb-6 pt-0 bg-pm-wash/20 dark:bg-pm-void/40 border-t border-pm-ink/10">
                                <p className="text-xs uppercase tracking-widest text-pm-muted mb-2">{t('profile.security.allowlist_heading')}</p>
                                <p className="text-xs text-pm-muted mb-2">{t('profile.security.allowlist_hint')}</p>
                                <textarea
                                  value={allowlistDraft}
                                  onChange={(e) => setAllowlistDraft(e.target.value)}
                                  rows={5}
                                  className="w-full font-mono text-sm px-3 py-2 border rounded-sm bg-white dark:bg-gray-950 dark:text-white border-pm-ink/20 mb-3"
                                  placeholder={t('profile.security.allowlist_placeholder')}
                                />
                                <div className="flex gap-2">
                                  <Button type="button" onClick={() => saveAllowlist(item.id)} disabled={saving}>
                                    {t('profile.security.allowlist_save')}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setExpandedAllowlistKey(null);
                                      setAllowlistDraft('');
                                    }}
                                    disabled={saving}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
