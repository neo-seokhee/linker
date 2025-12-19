// Analytics Configuration
import { AnalyticsConfig } from './types';

export const GA4_CONFIG: AnalyticsConfig = {
  web: {
    // TODO: Replace with your actual GA4 Measurement ID
    measurementId: process.env.EXPO_PUBLIC_GA4_MEASUREMENT_ID || 'G-XXXXXXXXXX',
  },
  debugMode: __DEV__,
};

// Event batching configuration
export const BATCH_CONFIG = {
  maxBatchSize: 10,
  flushIntervalMs: 5000,
};

// Scroll tracking configuration
export const SCROLL_CONFIG = {
  throttleMs: 200,
  milestones: [25, 50, 75, 100] as const,
};

// Impression tracking configuration
export const IMPRESSION_CONFIG = {
  viewportThreshold: 0.5, // 50% visible
  maxCachedItems: 1000,
};
