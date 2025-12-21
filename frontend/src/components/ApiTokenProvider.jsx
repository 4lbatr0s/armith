import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setTokenGetter } from '../services/api';

export const ApiTokenProvider = ({ children }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set token getter for API service
    setTokenGetter(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.warn('Failed to get Clerk token:', error);
        return null;
      }
    });
  }, [getToken]);

  return <>{children}</>;
};
