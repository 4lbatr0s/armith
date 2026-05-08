import { useEffect } from 'react';

/**
 * Load dashboard stats/verifications only while the Dashboard tab is active.
 * Avoids blocking other tabs with `isLoading` when opening e.g. `?tab=settings` first.
 */
export function useAdminDashboardSync(activeTab, fetchData, setIsLoading) {
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [activeTab, fetchData, setIsLoading]);
}
