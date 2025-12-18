// SkeletonLoader - Skeleton UI components for explore tab loading states
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

// Shimmer animation component
function ShimmerBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 100],
    });

    return (
        <View style={[{ width: width as any, height, backgroundColor: colors.card, borderRadius: 8, overflow: 'hidden' }, style]}>
            <Animated.View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: effectiveTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    transform: [{ translateX }],
                }}
            />
        </View>
    );
}

// Top 10 Skeleton (compact folded state)
export function Top10Skeleton() {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];

    return (
        <View style={styles.top10Container}>
            <View style={styles.top10Header}>
                <ShimmerBlock width={120} height={20} />
                <ShimmerBlock width={24} height={24} style={{ borderRadius: 12 }} />
            </View>
            <View style={[styles.top10Compact, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ShimmerBlock width={28} height={28} style={{ borderRadius: 14 }} />
                <ShimmerBlock width="70%" height={16} />
                <ShimmerBlock width={40} height={20} />
            </View>
        </View>
    );
}

// Featured Carousel Skeleton
export function FeaturedSkeleton() {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const { width: screenWidth } = useWindowDimensions();
    const cardWidth = Math.min(screenWidth * 0.75, 280);

    return (
        <View style={styles.featuredContainer}>
            <ShimmerBlock width={100} height={18} style={{ marginBottom: 12 }} />
            <View style={styles.featuredScroll}>
                {[1, 2].map((i) => (
                    <View
                        key={i}
                        style={[styles.featuredCard, { width: cardWidth, backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <ShimmerBlock width="100%" height={140} style={{ borderRadius: 12 }} />
                        <View style={styles.featuredContent}>
                            <ShimmerBlock width="80%" height={16} />
                            <ShimmerBlock width="50%" height={14} style={{ marginTop: 8 }} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// Feed Item Skeleton
export function FeedItemSkeleton() {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];

    return (
        <View style={[styles.feedItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ShimmerBlock width="100%" height={180} style={{ borderRadius: 12 }} />
            <View style={styles.feedContent}>
                <View style={styles.feedHeaderRow}>
                    <ShimmerBlock width={32} height={32} style={{ borderRadius: 16 }} />
                    <ShimmerBlock width={80} height={14} />
                    <ShimmerBlock width={50} height={20} style={{ borderRadius: 10 }} />
                </View>
                <ShimmerBlock width="90%" height={18} style={{ marginTop: 12 }} />
                <ShimmerBlock width="60%" height={18} style={{ marginTop: 8 }} />
                <View style={styles.feedActions}>
                    <ShimmerBlock width={60} height={24} />
                    <View style={styles.feedButtons}>
                        <ShimmerBlock width={36} height={36} style={{ borderRadius: 18 }} />
                        <ShimmerBlock width={36} height={36} style={{ borderRadius: 18 }} />
                    </View>
                </View>
            </View>
        </View>
    );
}

// Full Explore Skeleton (combines all sections)
export function ExploreSkeletonLoader() {
    return (
        <View style={styles.container}>
            <Top10Skeleton />
            <FeaturedSkeleton />
            <View style={styles.feedSection}>
                <ShimmerBlock width={80} height={18} style={{ marginBottom: 12 }} />
                <FeedItemSkeleton />
                <FeedItemSkeleton />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    // Top 10
    top10Container: {
        marginBottom: 20,
    },
    top10Header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    top10Compact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    // Featured
    featuredContainer: {
        marginBottom: 20,
    },
    featuredScroll: {
        flexDirection: 'row',
        gap: 12,
    },
    featuredCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    featuredContent: {
        padding: 12,
    },
    // Feed
    feedSection: {
        flex: 1,
    },
    feedItem: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    feedContent: {
        padding: 14,
    },
    feedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    feedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    feedButtons: {
        flexDirection: 'row',
        gap: 8,
    },
});
