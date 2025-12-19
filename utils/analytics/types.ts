// Analytics Types
export interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
}

export interface LinkImpressionParams {
  link_id: string;
  link_url: string;
  link_title: string;
  category: string;
  position: number;
  source: 'explore_feed' | 'storage' | 'featured' | 'top10';
  viewport_percentage: number;
}

export interface LinkClickParams {
  link_id: string;
  link_url: string;
  link_title: string;
  category: string;
  position: number;
  source: 'explore_feed' | 'storage' | 'featured' | 'top10';
  is_liked: boolean;
}

export interface LinkDwellParams {
  link_id: string;
  duration_seconds: number;
  is_engaged: boolean;
  source: string;
}

export interface ScrollMilestoneParams {
  screen_name: 'explore_feed' | 'storage';
  depth_percentage: 25 | 50 | 75 | 100;
  scroll_distance_px: number;
}

export interface AnalyticsConfig {
  web: {
    measurementId: string;
  };
  debugMode: boolean;
}

export interface IAnalyticsProvider {
  initialize: () => Promise<void>;
  logEvent: (eventName: string, params?: Record<string, any>) => Promise<void>;
  setUserId: (userId: string | null) => Promise<void>;
  setUserProperty: (name: string, value: string) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
}
