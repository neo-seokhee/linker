// Scroll Depth Tracking Hook
import { useCallback, useRef } from 'react';
import { NativeScrollEvent } from 'react-native';
import analytics from '@/utils/analytics/analytics';
import { ANALYTICS_EVENTS } from '@/utils/analytics/events';
import { SCROLL_CONFIG } from '@/utils/analytics/config';

type Milestone = typeof SCROLL_CONFIG.milestones[number];

export const useScrollDepth = (screenName: 'explore_feed' | 'storage') => {
  const reachedMilestones = useRef<Set<Milestone>>(new Set());
  const lastScrollY = useRef<number>(0);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  const trackScrollDepth = useCallback(
    (event: NativeScrollEvent) => {
      // Throttle scroll events
      if (throttleTimeout.current) return;

      throttleTimeout.current = setTimeout(() => {
        throttleTimeout.current = null;
      }, SCROLL_CONFIG.throttleMs);

      const { contentOffset, layoutMeasurement, contentSize } = event;
      const scrollY = contentOffset.y;
      const windowHeight = layoutMeasurement.height;
      const contentHeight = contentSize.height;

      // Calculate scroll percentage
      const scrollPercentage =
        contentHeight > windowHeight
          ? ((scrollY + windowHeight) / contentHeight) * 100
          : 100;

      // Check milestones
      for (const milestone of SCROLL_CONFIG.milestones) {
        if (
          scrollPercentage >= milestone &&
          !reachedMilestones.current.has(milestone)
        ) {
          reachedMilestones.current.add(milestone);

          // Log milestone event
          analytics.logEvent(ANALYTICS_EVENTS.SCROLL_MILESTONE, {
            screen_name: screenName,
            depth_percentage: milestone,
            scroll_distance_px: Math.round(scrollY),
          });
        }
      }

      lastScrollY.current = scrollY;
    },
    [screenName]
  );

  // Reset milestones (e.g., on screen change or refresh)
  const resetMilestones = useCallback(() => {
    reachedMilestones.current.clear();
    lastScrollY.current = 0;
  }, []);

  return {
    trackScrollDepth,
    resetMilestones,
    reachedMilestones: reachedMilestones.current,
  };
};
