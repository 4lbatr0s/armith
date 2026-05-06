import React from 'react';
import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

export const AuthPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();
  const [mode, setMode] = useState('sign-in');
  const nextParam = new URLSearchParams(location.search).get('next');
  const safeNext = nextParam && nextParam.startsWith('/') ? nextParam : '/upload-id';

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-pm-ink dark:border-white/30 border-t-pm-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm uppercase tracking-widest text-pm-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    const from = safeNext || location.state?.from?.pathname || '/upload-id';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex-1 w-full flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <span className="pm-kicker">Armith</span>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </h2>
          <p className="text-sm text-pm-muted uppercase tracking-wider">KYC verification workspace</p>
        </div>

        <div className="flex border-2 border-pm-ink dark:border-white/15 rounded-sm overflow-hidden shadow-brutal">
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
              mode === 'sign-in'
                ? 'bg-pm-accent text-white'
                : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('sign-up')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-l-2 border-pm-ink dark:border-white/15 ${
              mode === 'sign-up'
                ? 'bg-pm-accent text-white'
                : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="pm-panel p-4 sm:p-6 flex justify-center [&_.cl-card]:shadow-none [&_.cl-card]:border-0">
          {mode === 'sign-in' ? (
            <SignIn routing="path" path="/auth" signUpUrl="/auth" afterSignInUrl={safeNext} />
          ) : (
            <SignUp routing="path" path="/auth" signInUrl="/auth" afterSignUpUrl={safeNext} />
          )}
        </div>
      </div>
    </div>
  );
};
