import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from './ExternalLink';

export const Layout = ({ children }) => {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'tr' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navClass = (path) =>
    `pm-link-nav ${isActive(path) ? 'pm-link-nav-active' : ''}`;

  const docsHref = process.env.REACT_APP_DOCUMENTATION_URL || '/docs';

  const navLinkClass = (path, extra = '') =>
    `${navClass(path)} ${extra}`.trim();

  const verifyActive = isActive('/upload-id') || isActive('/upload-selfie');

  return (
    <div className="min-h-screen flex flex-col bg-pm-paper dark:bg-pm-void text-pm-ink dark:text-pm-ink-soft pm-grid-bg transition-colors duration-200">
      <a href="#main" className="sr-only-focusable">
        {t('layout.skip_to_content')}
      </a>
      <header className="sticky top-0 z-50 border-b-2 border-pm-ink dark:border-white/15 bg-pm-surface/95 dark:bg-pm-surface-dark/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <Link
              to={isSignedIn ? '/admin' : '/'}
              className="flex items-center gap-3 group shrink-0"
            >
              <span className="flex h-9 w-9 items-center justify-center border-2 border-pm-ink dark:border-white/25 bg-pm-accent text-white font-display font-extrabold text-xs tracking-tighter shadow-brutal group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
                A
              </span>
              <span className="font-display font-bold text-lg tracking-tight">Armith</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-6 min-w-0">
              <nav className="hidden sm:flex items-center gap-5" aria-label={t('layout.main_navigation')}>
                <ExternalLink href={docsHref} className="pm-link-nav">
                  {t('layout.documentation')}
                </ExternalLink>
                <Link to="/trust" className={navLinkClass('/trust')} aria-current={isActive('/trust') ? 'page' : undefined}>
                  {t('layout.trust_security')}
                </Link>
                {!isSignedIn && (
                  <>
                    <Link to="/" className={navLinkClass('/')} aria-current={isActive('/') ? 'page' : undefined}>
                      {t('layout.home')}
                    </Link>
                    <Link to="/pricing" className={navLinkClass('/pricing')} aria-current={isActive('/pricing') ? 'page' : undefined}>
                      {t('layout.pricing')}
                    </Link>
                  </>
                )}
                {isSignedIn && (
                  <>
                    <Link to="/admin" className={navLinkClass('/admin')} aria-current={isActive('/admin') ? 'page' : undefined}>
                      {t('layout.dashboard')}
                    </Link>
                    <Link to="/integrations" className={navLinkClass('/integrations')} aria-current={isActive('/integrations') ? 'page' : undefined}>
                      {t('layout.integrations')}
                    </Link>
                    <Link
                      to="/upload-id"
                      className={`pm-link-nav ${verifyActive ? 'pm-link-nav-active' : ''}`}
                      aria-current={verifyActive ? 'page' : undefined}
                    >
                      {t('layout.verify_identity')}
                    </Link>
                  </>
                )}
              </nav>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((o) => !o)}
                  className="sm:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border-2 border-transparent text-pm-muted hover:border-pm-ink/15 dark:hover:border-white/15 hover:text-pm-ink dark:hover:text-pm-ink-soft"
                  aria-expanded={mobileNavOpen}
                  aria-controls="mobile-nav-panel"
                  aria-label={mobileNavOpen ? t('layout.close_navigation') : t('layout.open_navigation')}
                >
                  {mobileNavOpen ? (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border-2 border-transparent px-2 text-xs font-bold uppercase tracking-widest text-pm-muted hover:border-pm-ink/20 dark:hover:border-white/20 hover:text-pm-ink dark:hover:text-pm-ink-soft"
                  aria-label={t('layout.switch_language')}
                >
                  {i18n.language === 'en' ? 'TR' : 'EN'}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border-2 border-transparent text-pm-muted hover:border-pm-ink/15 dark:hover:border-white/15 hover:text-pm-ink dark:hover:text-pm-ink-soft"
                  aria-label={t('layout.toggle_theme')}
                >
                  {theme === 'dark' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                {!isLoaded ? (
                  <div className="w-6 h-6 border-2 border-pm-ink dark:border-white/30 border-t-pm-accent rounded-full animate-spin" />
                ) : isSignedIn ? (
                  <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l-2 border-pm-ink/10 dark:border-white/10">
                    <div className="hidden md:block text-right max-w-[10rem] truncate">
                      <p className="text-xs font-semibold truncate">
                        {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-2 border-2 rounded-sm ${
                        isActive('/profile')
                          ? 'bg-pm-accent text-white border-pm-accent'
                          : 'border-pm-ink/20 dark:border-white/20 hover:bg-pm-wash dark:hover:bg-white/10'
                      }`}
                      aria-current={isActive('/profile') ? 'page' : undefined}
                    >
                      {t('layout.profile')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-xs font-bold uppercase tracking-wider px-3 py-2 border-2 border-pm-ink/20 dark:border-white/20 rounded-sm hover:bg-pm-wash dark:hover:bg-white/10"
                    >
                      {t('layout.sign_out')}
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/auth"
                    className="text-xs font-bold uppercase tracking-wider px-4 py-2 bg-pm-accent text-white border-2 border-pm-ink dark:border-white/20 shadow-brutal rounded-sm hover:opacity-95"
                  >
                    {t('layout.sign_in')}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {mobileNavOpen && (
            <nav
              id="mobile-nav-panel"
              className="sm:hidden border-t border-pm-ink/10 dark:border-white/10 py-4 flex flex-col gap-3"
              aria-label={t('layout.main_navigation')}
            >
              <ExternalLink href={docsHref} className="pm-link-nav py-1">
                {t('layout.documentation')}
              </ExternalLink>
              <Link to="/trust" className={`${navLinkClass('/trust')} py-1`} aria-current={isActive('/trust') ? 'page' : undefined}>
                {t('layout.trust_security')}
              </Link>
              {!isSignedIn && (
                <>
                  <Link to="/" className={`${navLinkClass('/')} py-1`} aria-current={isActive('/') ? 'page' : undefined}>
                    {t('layout.home')}
                  </Link>
                  <Link to="/pricing" className={`${navLinkClass('/pricing')} py-1`} aria-current={isActive('/pricing') ? 'page' : undefined}>
                    {t('layout.pricing')}
                  </Link>
                </>
              )}
              {isSignedIn && (
                <>
                  <Link to="/admin" className={`${navLinkClass('/admin')} py-1`} aria-current={isActive('/admin') ? 'page' : undefined}>
                    {t('layout.dashboard')}
                  </Link>
                  <Link to="/integrations" className={`${navLinkClass('/integrations')} py-1`} aria-current={isActive('/integrations') ? 'page' : undefined}>
                    {t('layout.integrations')}
                  </Link>
                  <Link to="/profile" className={`${navLinkClass('/profile')} py-1`} aria-current={isActive('/profile') ? 'page' : undefined}>
                    {t('layout.profile')}
                  </Link>
                  <Link
                    to="/upload-id"
                    className={`pm-link-nav py-1 ${verifyActive ? 'pm-link-nav-active' : ''}`}
                    aria-current={verifyActive ? 'page' : undefined}
                  >
                    {t('layout.verify_identity')}
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 flex flex-col w-full outline-none">
        {children}
      </main>

      <footer className="border-t-2 border-pm-ink dark:border-white/15 bg-pm-surface dark:bg-pm-surface-dark mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-pm-muted">
            <p className="font-display font-semibold text-pm-ink dark:text-pm-ink-soft">{t('layout.footer_text')}</p>
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-wider">
                <Link to="/trust" className="hover:text-pm-accent">
                  {t('layout.trust_security')}
                </Link>
                {!isSignedIn ? (
                  <Link to="/pricing" className="hover:text-pm-accent">
                    {t('layout.pricing')}
                  </Link>
                ) : null}
              </div>
              <p className="text-xs uppercase tracking-widest max-w-md sm:text-right">{t('layout.footer_subtext')}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
