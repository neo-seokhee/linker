// App Settings Context - Theme and app-wide settings management
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';

const THEME_KEY = '@linker_theme';

type ThemeMode = 'system' | 'light' | 'dark';

interface AppSettingsContextType {
    themeMode: ThemeMode;
    effectiveTheme: 'light' | 'dark';
    setThemeMode: (mode: ThemeMode) => void;
    isDarkMode: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useSystemColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('dark'); // Default to dark

    // Load saved theme on mount
    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_KEY);
            if (savedTheme) {
                setThemeModeState(savedTheme as ThemeMode);
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    };

    const setThemeMode = async (mode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_KEY, mode);
            setThemeModeState(mode);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    // Calculate effective theme based on mode and system preference
    const effectiveTheme: 'light' | 'dark' =
        themeMode === 'system'
            ? (systemColorScheme ?? 'dark')
            : themeMode;

    const isDarkMode = effectiveTheme === 'dark';

    return (
        <AppSettingsContext.Provider
            value={{
                themeMode,
                effectiveTheme,
                setThemeMode,
                isDarkMode,
            }}
        >
            {children}
        </AppSettingsContext.Provider>
    );
}

export function useAppSettings() {
    const context = useContext(AppSettingsContext);
    if (context === undefined) {
        throw new Error('useAppSettings must be used within an AppSettingsProvider');
    }
    return context;
}
