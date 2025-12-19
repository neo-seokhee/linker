// Native Analytics Provider using Firebase Analytics
import { GA4_CONFIG } from '../config';
import { IAnalyticsProvider } from '../types';

// Check if Firebase is available (not available in Expo Go)
let analytics: any = null;
let firebaseAvailable = false;

try {
  analytics = require('@react-native-firebase/analytics').default;
  firebaseAvailable = true;
} catch (error) {
  console.warn('[Analytics Native] Firebase not available (Expo Go?). Using stub.');
}

// Stub provider for when Firebase is not available (Expo Go)
class StubAnalyticsProvider implements IAnalyticsProvider {
  async initialize(): Promise<void> {
    console.log('[Analytics Native] Stub initialized (Firebase not available)');
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

class NativeAnalyticsProvider implements IAnalyticsProvider {
  private initialized = false;
  private enabled = true;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Firebase Analytics is auto-initialized via google-services.json
      await analytics().setAnalyticsCollectionEnabled(true);
      this.initialized = true;

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Native] Initialized');
      }
    } catch (error) {
      console.error('[Analytics Native] Initialization error:', error);
    }
  }

  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.enabled) return;

    try {
      // Firebase Analytics has parameter name restrictions
      const sanitizedParams = this.sanitizeParams(params);
      await analytics().logEvent(eventName, sanitizedParams);

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Native] Event:', eventName, sanitizedParams);
      }
    } catch (error) {
      console.error('[Analytics Native] Log event error:', error);
    }
  }

  async setUserId(userId: string | null): Promise<void> {
    if (!this.initialized) return;

    try {
      await analytics().setUserId(userId);

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Native] User ID set:', userId);
      }
    } catch (error) {
      console.error('[Analytics Native] Set user ID error:', error);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    if (!this.initialized) return;

    try {
      await analytics().setUserProperty(name, value);

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Native] User property set:', name, value);
      }
    } catch (error) {
      console.error('[Analytics Native] Set user property error:', error);
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;

    try {
      await analytics().setAnalyticsCollectionEnabled(enabled);

      if (GA4_CONFIG.debugMode) {
        console.log('[Analytics Native] Enabled:', enabled);
      }
    } catch (error) {
      console.error('[Analytics Native] Set enabled error:', error);
    }
  }

  // Sanitize parameters to meet Firebase Analytics requirements
  private sanitizeParams(params?: Record<string, any>): Record<string, any> | undefined {
    if (!params) return undefined;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Firebase Analytics key restrictions:
      // - Max 40 characters
      // - alphanumeric and underscores only
      const sanitizedKey = key.substring(0, 40).replace(/[^a-zA-Z0-9_]/g, '_');

      // Value restrictions:
      // - Strings max 100 characters
      // - Numbers and booleans are fine
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = value.substring(0, 100);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else {
        // Convert other types to string
        sanitized[sanitizedKey] = String(value).substring(0, 100);
      }
    }

    return sanitized;
  }
}

// Export stub if Firebase is not available, otherwise export real provider
export default firebaseAvailable ? new NativeAnalyticsProvider() : new StubAnalyticsProvider();
