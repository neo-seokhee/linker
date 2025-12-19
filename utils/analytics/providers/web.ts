// Web Analytics Provider using react-ga4
import ReactGA from 'react-ga4';
import { GA4_CONFIG } from '../config';
import { IAnalyticsProvider } from '../types';

class WebAnalyticsProvider implements IAnalyticsProvider {
  private initialized = false;
  private enabled = true;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Note: Don't use testMode in production - it prevents data from being sent
      ReactGA.initialize(GA4_CONFIG.web.measurementId, {
        gaOptions: {
          debug_mode: GA4_CONFIG.debugMode,
        },
      });
      this.initialized = true;

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Web] Initialized with ID:', GA4_CONFIG.web.measurementId);
      }
    } catch (error) {
      console.error('[Analytics Web] Initialization error:', error);
    }
  }

  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.enabled) return;

    try {
      ReactGA.event(eventName, params);

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Web] Event:', eventName, params);
      }
    } catch (error) {
      console.error('[Analytics Web] Log event error:', error);
    }
  }

  async setUserId(userId: string | null): Promise<void> {
    if (!this.initialized) return;

    try {
      if (userId) {
        ReactGA.set({ userId });
      } else {
        ReactGA.set({ userId: undefined });
      }

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Web] User ID set:', userId);
      }
    } catch (error) {
      console.error('[Analytics Web] Set user ID error:', error);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    if (!this.initialized) return;

    try {
      ReactGA.set({ [name]: value });

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Web] User property set:', name, value);
      }
    } catch (error) {
      console.error('[Analytics Web] Set user property error:', error);
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;

    if (GA4_CONFIG.debugMode) {
      console.log('[Analytics Web] Enabled:', enabled);
    }
  }
}

export default new WebAnalyticsProvider();
