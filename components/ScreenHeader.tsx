import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';

export function ScreenHeader() {
    const { effectiveTheme, setThemeMode } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const insets = useSafeAreaInsets();

    const handleToggle = () => {
        const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
        setThemeMode(newTheme);
    };

    return (
        <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
            <Text style={[styles.logo, { color: colors.text }]}>
                <Text style={{ color: colors.accent }}>L</Text>inker
            </Text>

            <TouchableOpacity
                style={styles.themeToggle}
                onPress={handleToggle}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={effectiveTheme === 'dark' ? 'sunny' : 'moon'}
                    size={24}
                    color={colors.text}
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
    },
    themeToggle: {
        padding: 8,
    },
});
