// Native Analytics Provider - Stub implementation
// Firebase has been removed due to build compatibility issues with Expo + New Architecture
// Web analytics uses react-ga4 instead, native apps use this stub

import { GA4_CONFIG } from '../config';
import { IAnalyticsProvider } from '../types';

class StubAnalyticsProvider implements IAnalyticsProvider {
  async initialize(): Promise<void> {
    if (GA4_CONFIG.debugMode) {
      console.log('[Analytics Native] Stub initialized (native analytics disabled)');
    }
  }

  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    if (GA4_CONFIG.debugMode) {
      console.log('[Analytics Native] Stub event:', eventName, params);
    }
  }

  async setUserId(userId: string | null): Promise<void> {
    if (GA4_CONFIG.debugMode) {
      console.log('[Analytics Native] Stub setUserId:', userId);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    if (GA4_CONFIG.debugMode) {
      console.log('[Analytics Native] Stub setUserProperty:', name, value);
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (GA4_CONFIG.debugMode) {
      console.log('[Analytics Native] Stub setEnabled:', enabled);
    }
  }
}

export default new StubAnalyticsProvider();
