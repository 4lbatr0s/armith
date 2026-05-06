import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';

export const ProfilePage = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'security' ? 'security' : 'account'
  );
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage] = useState(null);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyToken, setApiKeyToken] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get('tab') === 'security') setActiveTab('security');
  }, [searchParams]);

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
              onClick={() => setActiveTab('account')}
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
              onClick={() => setActiveTab('security')}
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
                        <tr key={item.id}>
                          <td className="px-3 py-3 text-sm font-semibold">{item.name}</td>
                          <td className="px-3 py-3 text-sm font-mono text-pm-muted">{item.prefix}</td>
                          <td className="px-3 py-3 text-sm text-pm-muted">{new Date(item.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-3 text-sm text-pm-muted">{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : '-'}</td>
                          <td className="px-3 py-3 text-sm text-pm-muted">
                            {item.revokedAt ? t('profile.security.revoked') : t('profile.security.active')}
                          </td>
                          <td className="px-3 py-3">
                            {!item.revokedAt && (
                              <Button variant="outline" onClick={() => handleRevokeApiKey(item.id)} disabled={saving}>
                                {t('profile.security.revoke')}
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
        )}
      </div>
    </div>
  );
};
