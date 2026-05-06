import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';

export const HomePage = () => {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();

  return (
    <div className="flex-1 w-full flex flex-col">
      <section className="relative flex-1 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="absolute right-0 top-24 hidden lg:block w-72 h-72 border-2 border-pm-accent/40 rotate-6 pointer-events-none" aria-hidden />
        <div className="absolute left-0 bottom-32 hidden lg:block w-48 h-48 bg-pm-accent-alt/15 border-2 border-pm-ink/10 dark:border-white/10 -rotate-3 pointer-events-none" aria-hidden />

        <div className="relative max-w-3xl">
          <span className="pm-kicker mb-6">{t('home.hero_badge')}</span>

          <h1 className="pm-heading-xl text-4xl sm:text-6xl lg:text-7xl leading-[1.05] mb-6">
            <span className="block">{t('home.hero_title_1')}</span>
            <span className="heading-gradient block mt-1">{t('home.hero_title_2')}</span>
          </h1>

          <p className="text-lg sm:text-xl text-pm-muted dark:text-pm-muted max-w-xl leading-relaxed mb-10 border-l-4 border-pm-accent pl-5">
            {t('home.hero_subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/auth" className="btn-primary text-center justify-center">
              {t('home.get_started')}
            </Link>
            <Link to={isSignedIn ? '/upload-id?mode=demo' : '/auth?next=%2Fupload-id%3Fmode%3Ddemo'} className="btn-secondary text-center justify-center">
              {t('home.live_demo')}
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 border-b-2 border-pm-ink dark:border-white/15 pb-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{t('home.features_title')}</h2>
            <p className="mt-1 text-sm text-pm-muted max-w-lg">{t('home.features_subtitle')}</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-pm-muted shrink-0">01 — 03</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <FeatureCard
            mark="01"
            title={t('home.feature_fast_title')}
            desc={t('home.feature_fast_desc')}
          />
          <FeatureCard
            mark="02"
            title={t('home.feature_secure_title')}
            desc={t('home.feature_secure_desc')}
          />
          <FeatureCard
            mark="03"
            title={t('home.feature_global_title')}
            desc={t('home.feature_global_desc')}
          />
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ mark, title, desc }) => (
  <article className="pm-panel p-6 sm:p-8 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform duration-200">
    <span className="font-display text-4xl font-black text-pm-accent/90 leading-none">{mark}</span>
    <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
    <p className="text-sm text-pm-muted leading-relaxed">{desc}</p>
  </article>
);
