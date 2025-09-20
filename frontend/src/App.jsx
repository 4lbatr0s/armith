import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TestKYCFlow } from './pages/TestKYCFlow';
import { UploadIdPage } from './pages/UploadIdPage';
import { UploadSelfiePage } from './pages/UploadSelfiePage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { Layout } from './components/Layout';
import './index.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Main KYC Flow */}
          <Route path="/" element={<HomePage />} />
          <Route path="/test-kyc-flow" element={<TestKYCFlow />} />
          <Route path="/upload-id" element={<UploadIdPage />} />
          <Route path="/upload-selfie" element={<UploadSelfiePage />} />
          <Route path="/result/:userId?" element={<ResultPage />} />
          
          {/* Admin Panel */}
          <Route path="/admin" element={<AdminPage />} />
          
          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 