// CategorySection component - Displays a category with its links
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import Colors from '@/constants/Colors';
import { Category, Link } from '@/constants/types';
import { LinkCard } from './LinkCard';
import { useAppSettings } from '@/hooks/useAppSettings';

interface CategorySectionProps {
    category: Category;
    links: Link[];
    onLinkPress: (link: Link) => void;
    onFavoriteToggle: (id: string) => void;
}

export function CategorySection({
    category,
    links,
    onLinkPress,
    onFavoriteToggle,
}: CategorySectionProps) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];

    if (links.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.icon}>{category.icon}</Text>
                <Text style={[styles.title, { color: colors.text }]}>{category.name}</Text>
                <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.accent }]}>{links.length}</Text>
                </View>
            </View>
            <View style={styles.grid}>
                {links.map((link) => (
                    <LinkCard
                        key={link.id}
                        link={link}
                        onPress={() => onLinkPress(link)}
                        onFavoriteToggle={() => onFavoriteToggle(link.id)}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    icon: {
        fontSize: 20,
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
});
