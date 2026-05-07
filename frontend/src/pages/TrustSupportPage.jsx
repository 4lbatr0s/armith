import React from 'react';
import { useTranslation } from 'react-i18next';

export const TrustSupportPage = () => {
  const { t } = useTranslation();
  const securityEmail = process.env.REACT_APP_SECURITY_EMAIL;
  const supportEmail = process.env.REACT_APP_SUPPORT_EMAIL;
  const docsHref = process.env.REACT_APP_DOCUMENTATION_URL || '/docs';

  const Mail = ({ addr, label }) =>
    addr ? (
      <a className="font-bold text-pm-accent underline decoration-2 underline-offset-2 hover:opacity-90" href={`mailto:${addr}`}>
        {label || addr}
      </a>
    ) : (
      <span className="text-pm-muted font-semibold">{t('trust.email_not_configured')}</span>
    );

  return (
    <div className="flex-1 w-full py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <span className="pm-kicker mb-4 inline-block">{t('layout.trust_security')}</span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">{t('trust.title')}</h1>
        <p className="text-lg text-pm-muted border-l-4 border-pm-accent-alt pl-4 mb-12">{t('trust.intro')}</p>

        <div className="space-y-10">
          <section className="pm-panel p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold">{t('trust.security_heading')}</h2>
            <p className="mt-3 text-sm text-pm-muted leading-relaxed">{t('trust.security_body')}</p>
            <p className="mt-4 text-sm">
              <span className="font-bold uppercase tracking-wider text-[10px] text-pm-muted">{t('trust.contact_label')}: </span>
              <Mail addr={securityEmail} />
            </p>
          </section>

          <section className="pm-panel p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold">{t('trust.support_heading')}</h2>
            <p className="mt-3 text-sm text-pm-muted leading-relaxed">{t('trust.support_body')}</p>
            <p className="mt-4 text-sm">
              <span className="font-bold uppercase tracking-wider text-[10px] text-pm-muted">{t('trust.contact_label')}: </span>
              <Mail addr={supportEmail} />
            </p>
          </section>

          <section className="pm-panel p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold">{t('trust.your_resp_heading')}</h2>
            <ul className="mt-4 space-y-2 text-sm text-pm-muted list-disc list-inside">
              <li>{t('trust.your_resp_keys')}</li>
              <li>{t('trust.your_resp_webhook')}</li>
            </ul>
            <p className="mt-6 text-sm">
              <a href={docsHref} className="font-bold text-pm-accent underline" rel="noopener noreferrer">
                {t('layout.documentation')}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
