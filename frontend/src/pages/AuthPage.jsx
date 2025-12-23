import React from 'react';
import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

export const AuthPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();
  const [mode, setMode] = useState('sign-in'); // 'sign-in' or 'sign-up'

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    const from = location.state?.from?.pathname || '/upload-id';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {mode === 'sign-in' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Access your KYC verification dashboard
          </p>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex justify-center space-x-4 mb-6">
            <button
            onClick={() => setMode('sign-in')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'sign-in'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
            }`}
            >
            Sign In
            </button>
            <button
            onClick={() => setMode('sign-up')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'sign-up'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
            }`}
            >
            Sign Up
            </button>
          </div>

        {/* Clerk Components */}
        <div className="flex justify-center">
          {mode === 'sign-in' ? (
            <SignIn 
              routing="path" 
              path="/auth"
              signUpUrl="/auth"
              afterSignInUrl="/upload-id"
            />
          ) : (
            <SignUp 
              routing="path" 
              path="/auth"
              signInUrl="/auth"
              afterSignUpUrl="/upload-id"
            />
          )}
        </div>

          <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
        </div>
      </div>
    </div>
  );
};
