// Main Analytics API - Platform-agnostic wrapper
import { Platform } from 'react-native';
import { IAnalyticsProvider } from './types';
import { checkConsent } from './consent';
import { GA4_CONFIG } from './config';

// Lazy load platform-specific providers
let provider: IAnalyticsProvider | null = null;

const getProvider = async (): Promise<IAnalyticsProvider> => {
  if (provider) return provider;

  if (Platform.OS === 'web') {
    const webProvider = await import('./providers/web');
    provider = webProvider.default;
  } else {
    const nativeProvider = await import('./providers/native');
    provider = nativeProvider.default;
  }

  return provider;
};

class Analytics {
  private initialized = false;
  private eventQueue: Array<{ name: string; params?: Record<string, any> }> = [];
  private isProcessingQueue = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check user consent
      const hasConsent = await checkConsent();
      if (!hasConsent) {
        if (GA4_CONFIG.debugMode) {
          console.log('[Analytics] User has not consented to analytics');
        }
        return;
      }

      const analyticsProvider = await getProvider();
      await analyticsProvider.initialize();
      this.initialized = true;

      // Process any queued events
      await this.processQueue();

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics] Initialized successfully');
      }
    } catch (error) {
      console.error('[Analytics] Initialization error:', error);
    }
  }

  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    try {
      // Check consent before logging
      const hasConsent = await checkConsent();
      if (!hasConsent) return;

      if (!this.initialized) {
        // Queue event for later
        this.eventQueue.push({ name: eventName, params });
        return;
      }

      const analyticsProvider = await getProvider();
      await analyticsProvider.logEvent(eventName, params);
    } catch (error) {
      console.error('[Analytics] Log event error:', error);
    }
  }

  async setUserId(userId: string | null): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const analyticsProvider = await getProvider();
      await analyticsProvider.setUserId(userId);
    } catch (error) {
      console.error('[Analytics] Set user ID error:', error);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const analyticsProvider = await getProvider();
      await analyticsProvider.setUserProperty(name, value);
    } catch (error) {
      console.error('[Analytics] Set user property error:', error);
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    try {
      const analyticsProvider = await getProvider();
      await analyticsProvider.setEnabled(enabled);
    } catch (error) {
      console.error('[Analytics] Set enabled error:', error);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.eventQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      const analyticsProvider = await getProvider();

      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          await analyticsProvider.logEvent(event.name, event.params);
        }
      }
    } catch (error) {
      console.error('[Analytics] Queue processing error:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Helper method to hash URLs for privacy
  hashUrl(url: string): string {
    // Simple hash function (not cryptographic, just for obfuscation)
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export default new Analytics();
