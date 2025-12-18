// Auth callback handler - redirects to home after OAuth
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';

export default function AuthCallbackScreen() {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];

    useEffect(() => {
        // The auth handling is done in useAuth's deep link listener
        // Just redirect to home after a short delay
        const timer = setTimeout(() => {
            router.replace('/');
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.accent} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
