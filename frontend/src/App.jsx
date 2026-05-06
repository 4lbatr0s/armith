import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { PricingPage } from './pages/PricingPage';
import { UploadIdPage } from './pages/UploadIdPage';
import { UploadSelfiePage } from './pages/UploadSelfiePage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { Layout } from './components/Layout';
import { ApiTokenProvider } from './components/ApiTokenProvider';
import './index.css';
import { ThemeProvider } from './components/ThemeContext';

const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const CLERK_SIGN_IN_URL = process.env.REACT_APP_CLERK_SIGN_IN_URL || '/auth/sign-in';
const CLERK_SIGN_UP_URL = process.env.REACT_APP_CLERK_SIGN_UP_URL || '/auth/sign-up';
const CLERK_SIGN_IN_FORCE_REDIRECT_URL =
  process.env.REACT_APP_CLERK_SIGN_IN_FORCE_REDIRECT_URL || '/';
const CLERK_SIGN_UP_FORCE_REDIRECT_URL =
  process.env.REACT_APP_CLERK_SIGN_UP_FORCE_REDIRECT_URL || '/';
const CLERK_SIGN_IN_FALLBACK_REDIRECT_URL =
  process.env.REACT_APP_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/';
const CLERK_SIGN_UP_FALLBACK_REDIRECT_URL =
  process.env.REACT_APP_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/';

if (!CLERK_PUBLISHABLE_KEY) {
  console.error('Missing REACT_APP_CLERK_PUBLISHABLE_KEY');
}

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/auth" replace />
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

export const App = () => {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={CLERK_SIGN_IN_URL}
      signUpUrl={CLERK_SIGN_UP_URL}
      signInForceRedirectUrl={CLERK_SIGN_IN_FORCE_REDIRECT_URL}
      signUpForceRedirectUrl={CLERK_SIGN_UP_FORCE_REDIRECT_URL}
      signInFallbackRedirectUrl={CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
      signUpFallbackRedirectUrl={CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}
    >
      <ApiTokenProvider>
        <ThemeProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout>
            <Routes>
              <Route path="/" element={
                <PublicRoute>
                  <HomePage />
                </PublicRoute>
              } />
              <Route path="/auth/*" element={<AuthPage />} />
              <Route path="/pricing" element={
                <PublicPricingRoute>
                  <PricingPage />
                </PublicPricingRoute>
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

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
        </ThemeProvider>
      </ApiTokenProvider>
    </ClerkProvider>
  );
};

export default App;
