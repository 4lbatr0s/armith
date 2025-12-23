import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const HomePage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center overflow-hidden relative">

      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-16">
        <div className="glass inline-block px-4 py-1.5 rounded-full mb-8">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-sm tracking-wide uppercase">
            {t('home.hero_badge') || 'Next Gen Identity Verification'}
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8">
          <span className="block mb-2">{t('home.hero_title_1')}</span>
          <span className="heading-gradient">{t('home.hero_title_2')}</span>
        </h1>

        <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-300 mb-12">
          {t('home.hero_subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/auth"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg btn-primary"
          >
            {t('home.get_started')}
          </Link>
          <Link
            to="/demo"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg btn-secondary"
          >
            {t('home.live_demo')}
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="⚡"
            title={t('home.feature_fast_title')}
            desc={t('home.feature_fast_desc')}
          />
          <FeatureCard
            icon="🛡️"
            title={t('home.feature_secure_title')}
            desc={t('home.feature_secure_desc')}
          />
          <FeatureCard
            icon="🌍"
            title={t('home.feature_global_title')}
            desc={t('home.feature_global_desc')}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="w-full py-8 text-center text-slate-500 dark:text-slate-400 text-sm relative z-10">
        <p>© {new Date().getFullYear()} Armith. All rights reserved.</p>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-2xl mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
      {desc}
    </p>
  </div>
);