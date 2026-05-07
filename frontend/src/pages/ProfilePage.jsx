import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';

export const ProfilePage = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [usage, setUsage] = useState(null);
  const [usageError, setUsageError] = useState(null);

  useEffect(() => {
    const raw = searchParams.get('tab');
    const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (v === 'security' || v === 'integration') {
      navigate('/integrations?tab=api-keys', { replace: true });
    }
  }, [searchParams, navigate]);

  const loadUsage = useCallback(async () => {
    try {
      setUsageError(null);
      const profileData = await apiService.getProfile();
      const profileUser = profileData?.data?.user;
      if (!profileUser) return;
      const limit =
        profileUser?.limitsOverride?.monthlyVerificationLimit ??
        (profileUser?.planTier === 'growth' ? 5000 : profileUser?.planTier === 'enterprise' ? null : 100);
      const used = profileUser?.verificationUsage?.currentPeriodCount || 0;
      const remaining = limit == null ? null : Math.max(limit - used, 0);
      setUsage({
        planTier: profileUser.planTier || 'free',
        used,
        limit,
        remaining
      });
    } catch (err) {
      setUsageError(err.message || t('profile.security.load_error'));
    }
  }, [t]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  return (
    <div className="flex-1 w-full py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 border-b-2 border-pm-ink/10 dark:border-white/10 pb-6">
          <span className="pm-kicker mb-2 inline-block text-[10px]">{t('profile.title')}</span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-pm-ink dark:text-pm-ink-soft">{t('profile.title')}</h1>
          <p className="text-sm text-pm-muted mt-2 max-w-2xl">{t('profile.account.subtitle')}</p>
        </div>

        {usageError && <div className="mb-4 rounded-sm border-2 border-pm-accent/40 bg-pm-accent/10 px-4 py-3 text-sm">{usageError}</div>}

        <div className="space-y-6">
          <div className="pm-panel p-6 space-y-4">
            <h2 className="font-display text-xl font-bold">{t('profile.account.title')}</h2>
            <p className="text-sm text-pm-muted">{t('profile.account.description')}</p>

            <div className="rounded-sm border-2 border-pm-ink/10 dark:border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-sm text-pm-muted">{t('profile.account.integrations_hint')}</p>
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

          {usage && (
            <div className="pm-panel p-6 space-y-2">
              <h3 className="font-display text-lg font-bold text-pm-ink dark:text-pm-ink-soft">{t('profile.usage_heading')}</h3>
              <p className="text-sm text-pm-muted">{t('profile.usage_intro')}</p>
              <div className="rounded-sm border-2 border-pm-ink/15 dark:border-white/20 bg-pm-wash/40 dark:bg-pm-void/60 px-4 py-3 text-sm space-y-1">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
