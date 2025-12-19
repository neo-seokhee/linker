// Impression Tracking Hook
import { useCallback, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import analytics from '@/utils/analytics/analytics';
import { ANALYTICS_EVENTS } from '@/utils/analytics/events';
import { IMPRESSION_CONFIG } from '@/utils/analytics/config';

interface ItemPosition {
  id: string;
  y: number;
  height: number;
}

interface ImpressionItem {
  id: string;
  title: string;
  url: string;
  category: string;
  position: number;
  source: 'explore_feed' | 'storage' | 'featured' | 'top10';
  is_liked?: boolean;
}

export const useImpressionTracking = () => {
  const [impressedIds, setImpressedIds] = useState<Set<string>>(new Set());
  const itemPositions = useRef<Map<string, ItemPosition>>(new Map());
  const windowHeight = Dimensions.get('window').height;

  // Save item layout position
  const saveItemPosition = useCallback((itemId: string, y: number, height: number) => {
    itemPositions.current.set(itemId, { id: itemId, y, height });
  }, []);

  // Track impressions based on scroll position
  const trackImpressions = useCallback(
    async (items: ImpressionItem[], scrollY: number) => {
      const viewportTop = scrollY;
      const viewportBottom = scrollY + windowHeight;

      for (const item of items) {
        // Skip if already impressed
        if (impressedIds.has(item.id)) continue;

        const position = itemPositions.current.get(item.id);
        if (!position) continue;

        // Calculate visibility
        const itemTop = position.y;
        const itemBottom = position.y + position.height;

        // Check if item is in viewport
        const isVisible =
          itemBottom >= viewportTop &&
          itemTop <= viewportBottom;

        if (!isVisible) continue;

        // Calculate viewport percentage
        const visibleTop = Math.max(itemTop, viewportTop);
        const visibleBottom = Math.min(itemBottom, viewportBottom);
        const visibleHeight = visibleBottom - visibleTop;
        const viewportPercentage = (visibleHeight / position.height) * 100;

        // Check if meets threshold
        if (viewportPercentage >= IMPRESSION_CONFIG.viewportThreshold * 100) {
          // Mark as impressed
          setImpressedIds((prev) => new Set(prev).add(item.id));

          // Log impression event
          await analytics.logEvent(ANALYTICS_EVENTS.LINK_IMPRESSION, {
            link_id: item.id,
            link_url: analytics.hashUrl(item.url),
            link_title: item.title,
            category: item.category,
            position: item.position,
            source: item.source,
            viewport_percentage: Math.round(viewportPercentage),
          });
        }
      }

      // Cleanup old items if cache is too large
      if (impressedIds.size > IMPRESSION_CONFIG.maxCachedItems) {
        setImpressedIds(new Set());
      }
    },
    [impressedIds, windowHeight]
  );

  // Reset impressed items (e.g., on refresh)
  const resetImpressions = useCallback(() => {
    setImpressedIds(new Set());
    itemPositions.current.clear();
  }, []);

  return {
    saveItemPosition,
    trackImpressions,
    resetImpressions,
    impressedIds,
  };
};
