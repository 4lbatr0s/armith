import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

const Check = () => (
  <svg className="h-5 w-5 shrink-0 text-pm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

export const PricingPage = () => {
  const { t } = useTranslation();
  const enterpriseMail = (() => {
    const sales = process.env.REACT_APP_SALES_EMAIL || process.env.REACT_APP_SUPPORT_EMAIL;
    if (!sales) return null;
    return `mailto:${sales}?subject=${encodeURIComponent(t('pricing.enterprise_mail_subject'))}`;
  })();

  return (
    <div className="flex-1 w-full py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <span className="pm-kicker mb-4 inline-block">{t('layout.pricing')}</span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">{t('pricing.title')}</h1>
          <p className="text-lg text-pm-muted border-l-4 border-pm-accent-alt pl-4">{t('pricing.subtitle')}</p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:gap-6">
          <PlanCard
            t={t}
            title={t('pricing.starter')}
            desc={t('pricing.starter_desc')}
            price="$0"
            suffix={t('pricing.month')}
            cta={
              <Link to="/auth" className="block">
                <Button className="w-full bg-pm-ink text-pm-ink-soft hover:bg-pm-ink/90 dark:bg-pm-ink-soft dark:text-pm-void dark:hover:bg-white">
                  {t('home.get_started')}
                </Button>
              </Link>
            }
            footer={
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <Check />
                  <span>100 {t('pricing.verifications_mo')}</span>
                </li>
                <li className="flex gap-3">
                  <Check />
                  <span>{t('pricing.standard_support')}</span>
                </li>
                <li className="flex gap-3">
                  <Check />
                  <span>{t('pricing.api_access')}</span>
                </li>
              </ul>
            }
          />

          <div className="lg:-mt-4 lg:mb-4">
            <PlanCard
              t={t}
              featured
              title={t('pricing.growth')}
              desc={t('pricing.growth_desc')}
              price="$49"
              suffix={t('pricing.month')}
              cta={
                <Link to="/auth" className="block">
                  <Button className="w-full">{t('home.get_started')}</Button>
                </Link>
              }
              footer={
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <Check />
                    <span>5,000 {t('pricing.verifications_mo')}</span>
                  </li>
                  <li className="flex gap-3">
                    <Check />
                    <span>{t('pricing.priority_support')}</span>
                  </li>
                  <li className="flex gap-3">
                    <Check />
                    <span>{t('pricing.advanced_analytics')}</span>
                  </li>
                </ul>
              }
            />
          </div>

          <PlanCard
            t={t}
            title={t('pricing.enterprise')}
            desc={t('pricing.enterprise_desc')}
            price={t('pricing.custom')}
            suffix=""
            cta={
              enterpriseMail ? (
                <a href={enterpriseMail} className="block">
                  <Button variant="outline" className="w-full border-2 border-pm-ink dark:border-white/25">
                    {t('pricing.contact_sales')}
                  </Button>
                </a>
              ) : (
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full border-2 border-pm-ink dark:border-white/25">
                    {t('home.get_started')}
                  </Button>
                </Link>
              )
            }
            footer={
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <Check />
                  <span>{t('pricing.unlimited_verifications')}</span>
                </li>
                <li className="flex gap-3">
                  <Check />
                  <span>{t('pricing.dedicated_manager')}</span>
                </li>
                <li className="flex gap-3">
                  <Check />
                  <span>{t('pricing.sla_contracts')}</span>
                </li>
              </ul>
            }
          />
        </div>

        <section className="mt-20 max-w-3xl rounded-sm border-2 border-pm-ink/15 dark:border-white/15 bg-pm-wash/30 dark:bg-pm-void/40 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold mb-4">{t('pricing.billing_heading')}</h2>
          <p className="text-sm text-pm-muted leading-relaxed mb-3">{t('pricing.billable_unit')}</p>
          <p className="text-sm text-pm-muted leading-relaxed mb-3">{t('pricing.not_billed')}</p>
          <p className="text-sm text-pm-muted leading-relaxed">
            {t('pricing.retention_note')}{' '}
            <Link to="/trust" className="font-bold text-pm-accent underline">
              {t('layout.trust_security')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
};

function PlanCard({ t, title, desc, price, suffix, cta, footer, featured }) {
  return (
    <div
      className={`flex flex-col pm-panel overflow-hidden ${
        featured ? 'border-pm-accent ring-2 ring-pm-accent/30 lg:scale-[1.02]' : ''
      }`}
    >
      <div className="p-6 sm:p-8 flex-1 flex flex-col border-b-2 border-pm-ink/10 dark:border-white/10">
        <h3 className="font-display text-2xl font-bold">{title}</h3>
        <p className="mt-3 text-sm text-pm-muted leading-relaxed">{desc}</p>
        <p className="mt-8 flex items-baseline gap-1">
          <span className="font-display text-4xl font-black tracking-tight">{price}</span>
          {suffix ? <span className="text-sm font-semibold uppercase tracking-wider text-pm-muted">{suffix}</span> : null}
        </p>
        <div className="mt-8">{cta}</div>
      </div>
      <div className="px-6 sm:px-8 py-6 bg-pm-wash/40 dark:bg-pm-void/80">
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-pm-muted mb-4">{t('pricing.whats_included')}</h4>
        {footer}
      </div>
    </div>
  );
}
