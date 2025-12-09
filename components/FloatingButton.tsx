// FloatingButton component - FAB for adding new links
import React from 'react';
import {
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';

interface FloatingButtonProps {
    onPress: () => void;
}

export function FloatingButton({ onPress }: FloatingButtonProps) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <Ionicons name="add" size={32} color="#000000" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00FFFF',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
});
