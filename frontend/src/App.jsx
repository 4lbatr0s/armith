import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { KindeProvider } from '@kinde-oss/kinde-auth-react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { CallbackPage } from './pages/CallbackPage';
import { UploadIdPage } from './pages/UploadIdPage';
import { UploadSelfiePage } from './pages/UploadSelfiePage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { Layout } from './components/Layout';
import './index.css';

function App() {
  return (
      <KindeProvider
        clientId={process.env.REACT_APP_KINDE_CLIENT_ID || "e747f7340ece46d7be9a54ef6f9f22c3"}
        domain={process.env.REACT_APP_KINDE_DOMAIN || "https://armith.kinde.com"}
        redirectUri={process.env.REACT_APP_KINDE_REDIRECT_URI || "http://localhost:3000/callback"}
        logoutUri={process.env.REACT_APP_KINDE_LOGOUT_URI || "http://localhost:3000"}
      >
      <Router>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/callback" element={<CallbackPage />} />
            
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
            
            {/* Admin Panel */}
            <Route path="/admin" element={<AdminPage />} />
            
            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </KindeProvider>
  );
}

export default App; 