import React from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export const Layout = ({ children }) => {
  const { user, isAuthenticated, isLoading, logout } = useKindeAuth();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col fallback-min-h-screen fallback-bg fallback-flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0 fallback-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <a href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center fallback-blue">
                  <span className="text-white font-bold text-sm">KYC</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">Armith</span>
              </a>
            </div>
            
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-8">
                <a 
                  href="/" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Home
                </a>
                {isAuthenticated && (
                  <a 
                    href="/test-kyc-flow" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Test KYC
                  </a>
                )}
                <a 
                  href="/test-auth" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Test Auth
                </a>
                <a 
                  href="/admin" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Admin
                </a>
              </nav>

              {/* User Menu */}
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              ) : isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.given_name || user?.family_name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <a 
                  href="/auth" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </a>
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
      <footer className="bg-white border-t flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 Armith. Built with Groq Llama 4 Scout for identity verification.</p>
            <p className="mt-2 text-sm">
              Secure • Fast • Accurate • Multi-Country Support
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}; 