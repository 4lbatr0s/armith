import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { apiService } from '../services/api';

export const CallbackPage = () => {
  const { isAuthenticated, isLoading, user } = useKindeAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('processing');
        setError(null);

        // Wait for authentication to complete
        if (!isLoading && isAuthenticated) {
          console.log('User authenticated, processing callback...', user);
          
          // Call backend to create/update user profile
          const response = await apiService.auth.callback();
          
          if (response.success) {
            setProfile(response.data.profile);
            setStatus('success');
            
            // Redirect to the intended destination or default page
            const returnTo = searchParams.get('returnTo') || '/upload-id';
            setTimeout(() => {
              navigate(returnTo, { replace: true });
            }, 2000); // Give user time to see success message
            
          } else {
            throw new Error(response.error || 'Failed to process authentication');
          }
        } else if (!isLoading && !isAuthenticated) {
          // Authentication failed
          setStatus('error');
          setError('Authentication failed. Please try again.');
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 3000);
        }
      } catch (err) {
        console.error('Callback processing error:', err);
        setStatus('error');
        setError(err.message || 'An unexpected error occurred');
        
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [isAuthenticated, isLoading, user, navigate, searchParams]);

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Processing your authentication...';
      case 'success':
        return 'Authentication successful! Redirecting...';
      case 'error':
        return 'Authentication failed. Redirecting to login...';
      default:
        return 'Loading...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSpinnerColor = () => {
    switch (status) {
      case 'processing':
        return 'border-blue-600';
      case 'success':
        return 'border-green-600';
      case 'error':
        return 'border-red-600';
      default:
        return 'border-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${getSpinnerColor()} border-t-transparent rounded-full animate-spin mx-auto mb-6`}></div>
          
          <h2 className={`text-xl font-semibold ${getStatusColor()}`}>
            {getStatusMessage()}
          </h2>
          
          {status === 'processing' && (
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we set up your account...
            </p>
          )}
          
          {status === 'success' && profile && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Welcome back, {profile.providerData?.given_name || user?.given_name}!</strong>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Your profile has been synchronized successfully.
              </p>
            </div>
          )}
          
          {status === 'error' && error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
              <p className="text-xs text-red-600 mt-1">
                You will be redirected to the login page shortly.
              </p>
            </div>
          )}
          
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-gray-100 border rounded-lg text-left">
              <p className="text-xs font-mono text-gray-600">
                <strong>Debug Info:</strong>
              </p>
              <p className="text-xs font-mono text-gray-500">
                Status: {status}
              </p>
              <p className="text-xs font-mono text-gray-500">
                Authenticated: {isAuthenticated ? 'Yes' : 'No'}
              </p>
              <p className="text-xs font-mono text-gray-500">
                Loading: {isLoading ? 'Yes' : 'No'}
              </p>
              {user && (
                <p className="text-xs font-mono text-gray-500">
                  User ID: {user.id}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
