import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { PricingPage } from './pages/PricingPage';
import { UploadIdPage } from './pages/UploadIdPage';
import { UploadSelfiePage } from './pages/UploadSelfiePage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { Layout } from './components/Layout';
import { ApiTokenProvider } from './components/ApiTokenProvider';
import './index.css';
import { ThemeProvider } from './components/ThemeContext';

const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  console.error('Missing REACT_APP_CLERK_PUBLISHABLE_KEY');
}

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
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
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
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
              <Route path="/result/:userId?" element={
                <ProtectedRoute>
                  <ResultPage />
                </ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminPage />
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
