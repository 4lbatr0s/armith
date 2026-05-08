import React from 'react';
import i18n from '../i18n';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Route error boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 w-full flex items-center justify-center px-4 py-16">
          <div className="pm-panel max-w-md w-full p-6 sm:p-8 text-center space-y-4">
            <h1 className="font-display text-xl font-bold text-pm-ink dark:text-pm-ink-soft">
              {i18n.t('common.error_boundary_title')}
            </h1>
            <p className="text-sm text-pm-muted">{i18n.t('common.error_boundary_hint')}</p>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-sm border-2 border-pm-ink dark:border-white/20 bg-pm-accent px-4 py-2 text-sm font-semibold text-white shadow-brutal hover:opacity-95"
              onClick={() => window.location.reload()}
            >
              {i18n.t('common.error_boundary_reload')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
