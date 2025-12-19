// Analytics Consent Management
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = '@analytics_consent';

export interface ConsentState {
  analytics: boolean;
  timestamp: number;
}

export const checkConsent = async (): Promise<boolean> => {
  try {
    const consentStr = await AsyncStorage.getItem(CONSENT_KEY);
    if (!consentStr) {
      // Default to true (opt-out model)
      return true;
    }
    const consent: ConsentState = JSON.parse(consentStr);
    return consent.analytics;
  } catch (error) {
    console.error('Error checking analytics consent:', error);
    return true; // Default to enabled
  }
};

export const setConsent = async (allowed: boolean): Promise<void> => {
  try {
    const consent: ConsentState = {
      analytics: allowed,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch (error) {
    console.error('Error setting analytics consent:', error);
  }
};

export const getConsentState = async (): Promise<ConsentState | null> => {
  try {
    const consentStr = await AsyncStorage.getItem(CONSENT_KEY);
    if (!consentStr) return null;
    return JSON.parse(consentStr);
  } catch (error) {
    console.error('Error getting consent state:', error);
    return null;
  }
};
