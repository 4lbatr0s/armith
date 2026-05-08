import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { notify } from '../lib/notify';

function splitAllowlistInput(text) {
  const chunks = [];
  for (const part of String(text ?? '').split(/[\n,;]+/)) {
    for (const s of part.trim().split(/\s+/)) {
      if (s) chunks.push(s);
    }
  }
  return chunks;
}

/** API keys + account-wide IP allowlist; per-key IP rules only on Growth/Enterprise (backend + `features`). */
export function ApiKeysPanel() {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState([]);
  const [perKeyIpAllowlist, setPerKeyIpAllowlist] = useState(false);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyToken, setApiKeyToken] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedAllowlistKey, setExpandedAllowlistKey] = useState(null);
  const [allowlistDraft, setAllowlistDraft] = useState('');
  const [accountAllowlistDraft, setAccountAllowlistDraft] = useState('');

  const loadAll = useCallback(async () => {
    try {
      setApiKeysLoading(true);
      const [keysData, profileData] = await Promise.all([apiService.getApiKeys(), apiService.getProfile()]);
      setApiKeys(keysData.apiKeys || []);
      setPerKeyIpAllowlist(Boolean(keysData.features?.perKeyIpAllowlist));
      const u = profileData?.data?.user;
      const ac = Array.isArray(u?.apiAllowedCidrs) ? u.apiAllowedCidrs : [];
      setAccountAllowlistDraft(ac.join('\n'));
    } catch (err) {
      setError(err.message || t('profile.security.load_error'));
    } finally {
      setApiKeysLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveAccountAllowlist = async () => {
    try {
      setSaving(true);
      setError(null);
      const lines = splitAllowlistInput(accountAllowlistDraft);
      await apiService.updateAccountApiIpAllowlist(lines);
      notify.success(t('integrations.account_ip_saved'));
      await loadAll();
    } catch (err) {
      setError(err.message || t('profile.security.allowlist_error'));
    } finally {
      setSaving(false);
    }
  };

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
      await loadAll();
      notify.success(t('profile.security.create_success'));
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
      notify.success(t('profile.security.revoke_success'));
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
    setError(null);
  };

  const saveAllowlist = async (keyId) => {
    try {
      setSaving(true);
      setError(null);
      const lines = splitAllowlistInput(allowlistDraft);
      await apiService.updateApiKeyAllowlist(keyId, lines);
      setExpandedAllowlistKey(null);
      notify.success(t('profile.security.allowlist_saved'));
      await loadAll();
    } catch (err) {
      setError(err.message || t('profile.security.allowlist_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-sm border-2 border-pm-ink/15 dark:border-white/20 bg-pm-wash/30 dark:bg-pm-void/50 px-4 py-4 text-sm space-y-2">
        <p className="font-display font-bold text-pm-ink dark:text-pm-ink-soft">{t('profile.security.rotation_heading')}</p>
        <p className="text-pm-muted">{t('profile.security.rotation_intro')}</p>
        <ul className="list-disc list-inside text-pm-muted space-y-1">
          <li>{t('profile.security.rotation_keys')}</li>
          <li>{t('profile.security.rotation_webhook')}</li>
        </ul>
      </div>

      <div className="pm-panel px-4 py-5 border-2 border-pm-accent-alt/30 space-y-3">
        <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">{t('integrations.account_ip_heading')}</h3>
        <p className="text-sm text-pm-muted leading-relaxed">{t('integrations.account_ip_desc')}</p>
        <textarea
          value={accountAllowlistDraft}
          onChange={(e) => setAccountAllowlistDraft(e.target.value)}
          rows={5}
          disabled={saving || apiKeysLoading}
          className="w-full font-mono text-sm px-3 py-2 border rounded-sm bg-pm-surface dark:bg-pm-surface-dark text-pm-ink dark:text-pm-ink-soft border-pm-ink/20"
          placeholder={t('profile.security.allowlist_placeholder')}
        />
        <Button type="button" onClick={saveAccountAllowlist} disabled={saving || apiKeysLoading}>
          {t('integrations.account_ip_save')}
        </Button>
      </div>

      {!perKeyIpAllowlist && (
        <p className="text-sm text-pm-muted border-l-4 border-pm-ink/20 dark:border-white/20 pl-3">{t('integrations.per_key_ip_upsell')}</p>
      )}

      {error && <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3 text-sm">{error}</div>}
      {apiKeyToken && (
        <div className="rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 p-4">
          <p className="text-xs uppercase tracking-widest text-pm-muted mb-2">{t('profile.security.one_time')}</p>
          <code className="block overflow-x-auto text-sm">{apiKeyToken}</code>
          <Button className="mt-3" variant="outline" onClick={() => navigator.clipboard.writeText(apiKeyToken)}>
            {t('profile.security.copy')}
          </Button>
        </div>
      )}

      <div id="integrations-api-keys">
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
          className="flex-1 px-3 py-2 border rounded-sm bg-pm-surface dark:bg-pm-surface-dark text-pm-ink dark:text-pm-ink-soft border-pm-ink/20 dark:border-white/20"
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
                  <td colSpan="6" className="px-3 py-4 text-sm text-pm-muted">
                    {t('profile.security.empty')}
                  </td>
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
                            {perKeyIpAllowlist &&
                            Array.isArray(item.allowedCidrs) &&
                            item.allowedCidrs.length > 0 ? (
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
                            {perKeyIpAllowlist ? (
                              <Button variant="outline" onClick={() => openAllowlistEditor(item)} disabled={saving}>
                                {t('profile.security.allowlist_edit')}
                              </Button>
                            ) : (
                              <span className="text-[10px] uppercase tracking-wide text-pm-muted self-center">{t('integrations.per_key_ip_badge')}</span>
                            )}
                            <Button variant="outline" onClick={() => handleRevokeApiKey(item.id)} disabled={saving}>
                              {t('profile.security.revoke')}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {perKeyIpAllowlist && !item.revokedAt && expandedAllowlistKey === item.id ? (
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
  );
}
