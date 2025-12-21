import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';

export const Layout = ({ children }) => {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const location = useLocation();

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

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col fallback-min-h-screen fallback-bg fallback-flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 flex-shrink-0 fallback-white transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to={isSignedIn ? "/admin" : "/"} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center fallback-blue">
                  <span className="text-white font-bold text-sm">KYC</span>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-white">Armith</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                {!isSignedIn && (
                  <Link
                    to="/"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/')
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                    }`}
                  >
                    {t('layout.home')}
                  </Link>
                )}
                {!isSignedIn && (
                  <Link
                    to="/pricing"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/pricing')
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                    }`}
                  >
                    {t('layout.pricing')}
                  </Link>
                )}
                {isSignedIn && (
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/admin')
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                    }`}
                  >
                    {t('layout.dashboard')}
                  </Link>
                )}
                {isSignedIn && (
                  <Link
                    to="/upload-id"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/upload-id') || isActive('/upload-selfie')
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                    }`}
                  >
                    {t('layout.verify_identity')}
                  </Link>
                )}
              </nav>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none mr-2 font-medium text-sm"
              >
                {i18n.language === 'en' ? 'TR' : 'EN'}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>

              {/* User Menu */}
              {!isLoaded ? (
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              ) : isSignedIn ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.emailAddresses?.[0]?.emailAddress}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('layout.sign_out')}
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {t('layout.sign_in')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex-shrink-0 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>{t('layout.footer_text')}</p>
            <p className="mt-2 text-sm">
              {t('layout.footer_subtext')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
