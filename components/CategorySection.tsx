// CategorySection component - Displays a collapsible category with its links
import Colors from '@/constants/Colors';
import { Category, Link } from '@/constants/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    LayoutAnimation,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import { LinkCard } from './LinkCard';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Check if link was added within last 7 days
const isNewLink = (createdAt: string): boolean => {
    const linkDate = new Date(createdAt);
    const now = new Date();
    const diffTime = now.getTime() - linkDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
};

interface CategorySectionProps {
    category: Category;
    links: Link[];
    onLinkPress: (link: Link) => void;
    onFavoriteToggle: (id: string) => void;
    defaultExpanded?: boolean;
}

export function CategorySection({
    category,
    links,
    onLinkPress,
    onFavoriteToggle,
    defaultExpanded = true,
}: CategorySectionProps) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (links.length === 0) {
        return null;
    }

    // Count new links
    const newLinksCount = links.filter(link => isNewLink(link.createdAt)).length;

    const toggleExpanded = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                onPress={toggleExpanded}
                activeOpacity={0.7}
            >
                <Text style={styles.icon}>{category.icon}</Text>
                <Text style={[styles.title, { color: colors.text }]}>{category.name}</Text>

                <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.accent }]}>{links.length}</Text>
                </View>

                {/* Chevron */}
                <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                    style={{ marginLeft: 8 }}
                />
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.grid}>
                    {links.map((link) => (
                        <LinkCard
                            key={link.id}
                            link={link}
                            isNew={isNewLink(link.createdAt)}
                            onPress={() => onLinkPress(link)}
                            onFavoriteToggle={() => onFavoriteToggle(link.id)}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

// Export for use elsewhere
export { isNewLink };

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
        paddingVertical: 8,
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
    newBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginRight: 8,
    },
    newBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFFFFF',
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
