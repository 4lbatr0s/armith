import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import { buildClerkAppearance } from './lib/clerkAppearance';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { PricingPage } from './pages/PricingPage';
import { TrustSupportPage } from './pages/TrustSupportPage';
import { UploadIdPage } from './pages/UploadIdPage';
import { UploadSelfiePage } from './pages/UploadSelfiePage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ApiTokenProvider } from './components/ApiTokenProvider';
import './index.css';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { ToasterHost } from './components/ToasterHost';

const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const CLERK_SIGN_IN_URL = process.env.REACT_APP_CLERK_SIGN_IN_URL || '/auth/sign-in';
const CLERK_SIGN_UP_URL = process.env.REACT_APP_CLERK_SIGN_UP_URL || '/auth/sign-up';
// Default `/` so static hosts (no /admin → index.html rewrite) still return 200; SignedIn users are sent to /admin client-side via PublicRoute.
const CLERK_SIGN_IN_FORCE_REDIRECT_URL =
  process.env.REACT_APP_CLERK_SIGN_IN_FORCE_REDIRECT_URL || '/';
const CLERK_SIGN_UP_FORCE_REDIRECT_URL =
  process.env.REACT_APP_CLERK_SIGN_UP_FORCE_REDIRECT_URL || '/';
const CLERK_SIGN_IN_FALLBACK_REDIRECT_URL =
  process.env.REACT_APP_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/';
const CLERK_SIGN_UP_FALLBACK_REDIRECT_URL =
  process.env.REACT_APP_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/';
const DOCUMENTATION_URL = process.env.REACT_APP_DOCUMENTATION_URL;

if (!CLERK_PUBLISHABLE_KEY) {
  console.error('Missing REACT_APP_CLERK_PUBLISHABLE_KEY');
}

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to={`/auth?next=${next}`} replace />
      </SignedOut>
    </>
  );
};

// Public route that redirects authenticated users
const PublicRoute = ({ children }) => {
  return (
    <>
      <SignedIn>
        <Navigate to="/admin" replace />
      </SignedIn>
      <SignedOut>{children}</SignedOut>
    </>
  );
};

// Pricing page - only for unauthenticated users
const PublicPricingRoute = ({ children }) => {
  return (
    <>
      <SignedIn>
        <Navigate to="/admin" replace />
      </SignedIn>
      <SignedOut>{children}</SignedOut>
    </>
  );
};

const DocsRedirectRoute = () => {
  if (typeof window !== 'undefined') {
    const fallbackDocsUrl = `${window.location.origin}/docs/`;
    window.location.replace(DOCUMENTATION_URL || fallbackDocsUrl);
  }
  return null;
};

/** Router + Clerk beneath theme so `appearance` tracks light/dark (`html.dark`). */
const AppRoutes = () => {
  const { theme } = useTheme();
  const appearance = useMemo(() => buildClerkAppearance(theme), [theme]);

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={appearance}
      signInUrl={CLERK_SIGN_IN_URL}
      signUpUrl={CLERK_SIGN_UP_URL}
      signInForceRedirectUrl={CLERK_SIGN_IN_FORCE_REDIRECT_URL}
      signUpForceRedirectUrl={CLERK_SIGN_UP_FORCE_REDIRECT_URL}
      signInFallbackRedirectUrl={CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
      signUpFallbackRedirectUrl={CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}
    >
      <ApiTokenProvider>
        <Router>
          <ToasterHost />
          <Layout>
            <ErrorBoundary>
            <Routes>
              {/* Public pages before `/` and `*` */}
              <Route path="/trust" element={<TrustSupportPage />} />
              <Route path="/trust/" element={<TrustSupportPage />} />
              <Route path="/docs" element={<DocsRedirectRoute />} />
              <Route path="/auth/*" element={<AuthPage />} />
              <Route path="/pricing" element={
                <PublicPricingRoute>
                  <PricingPage />
                </PublicPricingRoute>
              } />
              <Route path="/" element={
                <PublicRoute>
                  <HomePage />
                </PublicRoute>
              } />

              <Route path="/upload-id" element={
                <ProtectedRoute>
                  <UploadIdPage />
                </ProtectedRoute>
              } />
              <Route path="/upload-selfie" element={
                <ProtectedRoute>
                  <UploadSelfiePage />
                </ProtectedRoute>
              } />
              <Route path="/result/:profileId?" element={
                <ProtectedRoute>
                  <ResultPage />
                </ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/integrations" element={
                <ProtectedRoute>
                  <IntegrationsPage />
                </ProtectedRoute>
              } />
              <Route path="/integrations/" element={
                <ProtectedRoute>
                  <IntegrationsPage />
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </ErrorBoundary>
          </Layout>
        </Router>
      </ApiTokenProvider>
    </ClerkProvider>
  );
};

export const App = () => (
  <ThemeProvider>
    <AppRoutes />
  </ThemeProvider>
);

export default App;
