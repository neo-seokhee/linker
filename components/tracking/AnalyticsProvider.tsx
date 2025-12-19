// Analytics Provider
import { useAuth } from '@/hooks/useAuth';
import analytics from '@/utils/analytics/analytics';
import React, { createContext, ReactNode, useContext, useEffect } from 'react';

interface AnalyticsContextValue {
  initialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({ initialized: false });

export const useAnalyticsContext = () => useContext(AnalyticsContext);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const { user } = useAuth();
  const [initialized, setInitialized] = React.useState(false);

  // Initialize analytics on mount
  useEffect(() => {
    const init = async () => {
      await analytics.initialize();
      setInitialized(true);
    };
    init();
  }, []);

  // Update user ID when auth state changes
  useEffect(() => {
    if (!initialized) return;

    if (user) {
      analytics.setUserId(user.id);
    } else {
      analytics.setUserId(null);
    }
  }, [user, initialized]);

  return (
    <AnalyticsContext.Provider value={{ initialized }}>
      {children}
    </AnalyticsContext.Provider>
  );
};
