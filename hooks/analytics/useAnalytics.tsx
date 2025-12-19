// Main Analytics Hook
import { useCallback } from 'react';
import analytics from '@/utils/analytics/analytics';
import { ANALYTICS_EVENTS } from '@/utils/analytics/events';

export const useAnalytics = () => {
  const logEvent = useCallback(async (eventName: string, params?: Record<string, any>) => {
    await analytics.logEvent(eventName, params);
  }, []);

  const setUserId = useCallback(async (userId: string | null) => {
    await analytics.setUserId(userId);
  }, []);

  const setUserProperty = useCallback(async (name: string, value: string) => {
    await analytics.setUserProperty(name, value);
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    await analytics.setEnabled(enabled);
  }, []);

  return {
    logEvent,
    setUserId,
    setUserProperty,
    setEnabled,
    events: ANALYTICS_EVENTS,
  };
};
