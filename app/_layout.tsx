// Root Layout with LinksProvider, AppSettingsProvider, and AuthProvider
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppSettingsProvider, useAppSettings } from '@/hooks/useAppSettings';
import { AuthProvider } from '@/hooks/useAuth';
import { LinksProvider } from '@/hooks/useLinks';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppSettingsProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </AppSettingsProvider>
  );
}

function RootLayoutNav() {
  const { effectiveTheme } = useAppSettings();

  // Custom dark theme with cyan accent
  const LinkerDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#000000',
      card: '#000000',
      primary: '#00FFFF',
    },
  };

  const LinkerLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#FFFFFF',
      card: '#FFFFFF',
      primary: '#00FFFF',
    },
  };

  // Auth check removed from root - individual tabs handle auth as needed
  // (e.g., 보관 tab requires login, 탐색 tab does not)

  return (
    <ThemeProvider value={effectiveTheme === 'dark' ? LinkerDarkTheme : LinkerLightTheme}>
      <LinksProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>
      </LinksProvider>
    </ThemeProvider>
  );
}

