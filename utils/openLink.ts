// openLink utility - Opens links in-app on native, external on web
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/**
 * Opens a URL.
 * - On web: opens in a new tab
 * - On native (iOS/Android): opens in an in-app browser
 */
export const openLink = async (url: string) => {
    if (Platform.OS === 'web') {
        // Web: open in new tab
        window.open(url, '_blank');
    } else {
        // Native: open in-app browser
        await WebBrowser.openBrowserAsync(url, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            controlsColor: '#00D4AA',
            toolbarColor: '#1A1A2E',
        });
    }
};
