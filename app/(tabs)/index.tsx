// Enhanced Explore Tab with Ranking Animations, Carousel, Filters, and Sticky Header
import { InAppBrowserModal } from '@/components/InAppBrowserModal';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ExploreSkeletonLoader } from '@/components/SkeletonLoader';
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { useExplore } from '@/hooks/useExplore';
import { useLinks } from '@/hooks/useLinks';
import { useImpressionTracking } from '@/hooks/analytics/useImpressionTracking';
import { useScrollDepth } from '@/hooks/analytics/useScrollDepth';
import analytics from '@/utils/analytics/analytics';
import { ANALYTICS_EVENTS } from '@/utils/analytics/events';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Default avatar for users without profile image (PNG for Image component compatibility)
const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/shapes/png?seed=default&backgroundColor=b6e3f4&size=80';

// Types
interface ExploreFeedItem {
    id: string;
    url: string;
    title: string;
    thumbnail: string;
    description?: string;
    username: string;
    userAvatar?: string;
    likes: number;
    autoCategory: string;
    isLiked: boolean;
}

interface Top10Item {
    id: string;
    rank: number;
    title: string;
    url: string;
    thumbnail: string;
    description?: string;
    likes: number;
    category: string;
    rankChange: 'up' | 'down' | 'new' | 'same';
    rankDelta?: number;
    isLiked?: boolean; // Added to track like state
}

// Auto-categorize based on URL domain and keywords
const autoCategorize = (url: string, title: string): string => {
    const domain = new URL(url).hostname.toLowerCase();
    const titleLower = title.toLowerCase();

    if (domain.includes('youtube.com') || domain.includes('youtu.be')) return '영상';
    if (domain.includes('github.com')) return '개발';
    if (domain.includes('medium.com') || domain.includes('blog')) return '블로그';
    if (domain.includes('news') || domain.includes('techcrunch')) return '뉴스';

    if (titleLower.includes('recipe') || titleLower.includes('요리') || titleLower.includes('음식')) return '요리';
    if (titleLower.includes('design') || titleLower.includes('디자인')) return '디자인';
    if (titleLower.includes('travel') || titleLower.includes('여행')) return '여행';
    if (titleLower.includes('music') || titleLower.includes('음악')) return '음악';

    return '일반';
};

// Empty data - will be populated from Supabase after SQL migration
const TOP_10_DATA: Top10Item[] = [];

// Empty featured data - admin will manage via /admin page
const FEATURED_DATA: ExploreFeedItem[] = [];

const CATEGORIES = ['전체', '개발', '디자인', '영상', '블로그', '뉴스', '요리', '여행', '음악', '일반'];

// Generate empty feed - will be populated from live data
const generateFeedData = (startIndex: number, count: number): ExploreFeedItem[] => {
    return []; // Return empty array - no more dummy data
};

export default function ExploreScreen() {
    const { effectiveTheme, setThemeMode } = useAppSettings();
    const insets = useSafeAreaInsets();
    const colors = Colors[effectiveTheme];
    const { addLink, categories, links } = useLinks();

    // Use live explore data from Supabase
    const { feedData: liveFeeds, top10Data: liveTop10, featuredData: liveFeatured, isLoading: exploreLoading, loadMoreFeed, toggleLike, refreshData } = useExplore();
    const { session } = useAuth();

    // Refresh data when tab comes into focus
    useFocusEffect(
        useCallback(() => {
            refreshData();
        }, [refreshData])
    );

    // Convert ExploreLink to ExploreFeedItem for UI compatibility
    const feedData: ExploreFeedItem[] = liveFeeds.map(link => ({
        id: link.id,
        url: link.url,
        title: link.title,
        thumbnail: link.thumbnail,
        description: link.description,
        username: link.userNickname || 'user',
        userAvatar: link.userProfileImage || DEFAULT_AVATAR_URL,
        likes: link.likes,
        autoCategory: link.category,
        isLiked: link.isLiked,
    }));

    // Convert top10 data for UI
    const TOP_10_DATA: Top10Item[] = liveTop10.map(link => ({
        id: link.id,
        rank: link.rank,
        title: link.title,
        url: link.url,
        thumbnail: link.thumbnail,
        description: link.description,
        likes: link.likes,
        category: link.category,
        rankChange: link.rankChange,
        rankDelta: link.rankDelta,
        isLiked: link.isLiked, // Include isLiked from source data
    }));

    // Convert featured data for UI
    const FEATURED_DATA: ExploreFeedItem[] = liveFeatured.map(link => ({
        id: link.id,
        url: link.url,
        title: link.title,
        thumbnail: link.thumbnail,
        description: link.description,
        username: link.userNickname || 'featured',
        userAvatar: link.userProfileImage || DEFAULT_AVATAR_URL,
        likes: link.likes,
        autoCategory: link.category,
        isLiked: link.isLiked,
    }));

    const [top10Expanded, setTop10Expanded] = useState(false);
    const [currentTop10Index, setCurrentTop10Index] = useState(0);
    const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
    const [selectedSaveItem, setSelectedSaveItem] = useState<ExploreFeedItem | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const showToastNotification = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('전체');
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [isTop10Sticky, setIsTop10Sticky] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [browserLink, setBrowserLink] = useState<{ id: string; url: string; title: string; isLiked: boolean; source: 'explore_feed' | 'storage' | 'featured' | 'top10' } | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);


    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Analytics tracking hooks
    const { saveItemPosition, trackImpressions, resetImpressions } = useImpressionTracking();
    const { trackScrollDepth, resetMilestones } = useScrollDepth('explore_feed');

    // Reset tracking when tab comes into focus
    useFocusEffect(
        useCallback(() => {
            resetImpressions();
            resetMilestones();
        }, [resetImpressions, resetMilestones])
    );

    // Auto-scroll Top 10 every 2 seconds with fade animation
    useEffect(() => {
        if (top10Expanded) return;
        if (TOP_10_DATA.length === 0) return; // Don't auto-scroll if no data

        const interval = setInterval(() => {
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0.5,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            setCurrentTop10Index((prev) => {
                if (TOP_10_DATA.length === 0) return 0;
                return (prev + 1) % TOP_10_DATA.length;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [top10Expanded, TOP_10_DATA]);

    // Use toggleLike from useExplore hook to save likes to Supabase
    const handleLike = (itemId: string) => {
        if (!session) {
            setShowLoginPrompt(true);
            return;
        }

        // Find the item to get its details for analytics
        const item = feedData.find(f => f.id === itemId) || TOP_10_DATA.find(t => t.id === itemId);
        if (item) {
            analytics.logEvent(ANALYTICS_EVENTS.LINK_LIKE, {
                link_id: itemId,
                link_url: analytics.hashUrl(item.url),
                link_title: item.title,
                category: 'category' in item ? item.category : item.autoCategory,
                source: 'explore_feed',
            });
        }

        toggleLike(itemId);
    };

    const handleSave = (item: ExploreFeedItem) => {
        if (!session) {
            setShowLoginPrompt(true);
            return;
        }
        // Check if link already exists by URL
        const existingLink = links.find(link => link.url === item.url);
        if (existingLink) {
            showToastNotification('이미 저장된 링크입니다');
            return;
        }
        setSelectedSaveItem(item);
    };

    const handleConfirmSave = async () => {
        if (!selectedSaveItem || !selectedCategory) return;

        // Track save event
        analytics.logEvent(ANALYTICS_EVENTS.LINK_SAVE, {
            link_id: selectedSaveItem.id,
            link_url: analytics.hashUrl(selectedSaveItem.url),
            link_title: selectedSaveItem.title,
            category: selectedSaveItem.autoCategory,
            source: 'explore_feed',
        });

        await addLink({
            url: selectedSaveItem.url,
            ogTitle: selectedSaveItem.title,
            ogImage: selectedSaveItem.thumbnail,
            ogDescription: selectedSaveItem.description,
            categoryId: selectedCategory,
            isFavorite: false,
            isPublic: true,
        });

        setSelectedSaveItem(null);
        setSelectedCategory('');
        alert('보관함에 저장되었습니다!');
    };

    // Pull-to-refresh handler
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const loadMore = () => {
        // Use loadMoreFeed from useExplore hook
        loadMoreFeed();
    };

    const filteredFeedData = filterCategory === '전체'
        ? feedData
        : feedData.filter(item => item.autoCategory === filterCategory);

    const renderRankBadge = (item: Top10Item) => {
        return (
            <View style={styles.rankBadgeContainer}>
                <View style={styles.rankBadge}>
                    <Text style={[
                        styles.rankNumber,
                        { color: colors.text }
                    ]}>
                        {item.rank}
                    </Text>
                </View>
                <View style={styles.rankChangeContainer}>
                    {item.rankChange === 'new' ? (
                        <View style={[styles.newBadge, { backgroundColor: colors.accent }]}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                    ) : item.rankChange === 'same' ? (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>-</Text>
                    ) : (
                        <View style={styles.rankChangeIndicator}>
                            <Ionicons
                                name={item.rankChange === 'up' ? 'arrow-up' : 'arrow-down'}
                                size={12}
                                color={item.rankChange === 'up' ? '#EF4444' : '#3B82F6'}
                            />
                            {item.rankDelta && (
                                <Text style={[
                                    styles.rankDelta,
                                    { color: item.rankChange === 'up' ? '#EF4444' : '#3B82F6' }
                                ]}>
                                    {item.rankDelta}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderFeedItem = (item: ExploreFeedItem, isCarousel: boolean = false, position: number = 0, source: 'explore_feed' | 'featured' = 'explore_feed') => {
        const isLiked = item.isLiked; // Use isLiked from data, not local state

        const handleOpenLink = () => {
            // Track click event
            analytics.logEvent(ANALYTICS_EVENTS.LINK_CLICK, {
                link_id: item.id,
                link_url: analytics.hashUrl(item.url),
                link_title: item.title,
                category: item.autoCategory,
                position: position,
                source: source,
                is_liked: isLiked,
            });

            if (Platform.OS === 'web') {
                window.open(item.url, '_blank');
            } else {
                setBrowserLink({ id: item.id, url: item.url, title: item.title, isLiked: item.isLiked, source: source });
            }
        };

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    isCarousel ? styles.carouselItem : styles.feedItem,
                    { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={handleOpenLink}
                onLayout={(event) => {
                    if (!isCarousel) {
                        // Save position for impression tracking (only for feed items, not carousel)
                        const { y, height } = event.nativeEvent.layout;
                        saveItemPosition(item.id, y, height);
                    }
                }}
                activeOpacity={0.8}
            >
                <Image source={{ uri: item.thumbnail }} style={styles.feedThumbnail} />

                <View style={styles.feedContent}>
                    <View style={styles.feedHeader}>
                        <Image source={{ uri: item.userAvatar }} style={styles.userAvatar} />
                        <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
                        <View style={[styles.categoryTag, { backgroundColor: colors.accent + '20' }]}>
                            <Text style={[styles.categoryTagText, { color: colors.accent }]}>{item.autoCategory}</Text>
                        </View>
                    </View>

                    <Text style={[styles.feedTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    <View style={styles.feedActions}>
                        <View style={styles.likeCount}>
                            <Ionicons name="heart" size={16} color={colors.textSecondary} />
                            <Text style={[styles.likeCountText, { color: colors.textSecondary }]}>
                                {item.likes + (isLiked ? 1 : 0)}
                            </Text>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: isLiked ? colors.accent : colors.background }]}
                                onPress={() => handleLike(item.id)}
                            >
                                <Ionicons
                                    name={isLiked ? 'heart' : 'heart-outline'}
                                    size={18}
                                    color={isLiked ? '#FFFFFF' : colors.text}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                                onPress={() => handleSave(item)}
                            >
                                <Ionicons name="bookmark-outline" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <ScreenHeader />

            {/* Show skeleton while loading */}
            {exploreLoading && TOP_10_DATA.length === 0 ? (
                <ExploreSkeletonLoader />
            ) : (
                <>
                    {/* Sticky Top 10 Section */}
                    <View style={[styles.stickyTop10, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                        <View style={styles.top10Header}>
                            <TouchableOpacity
                                style={styles.top10HeaderButton}
                                onPress={() => setTop10Expanded(!top10Expanded)}
                            >
                                <View style={styles.top10TitleRow}>
                                    <Ionicons name="trophy" size={18} color={colors.accent} />
                                    <Text style={[styles.top10Title, { color: colors.text }]}>실시간 인기 Top 10</Text>
                                </View>
                                <Ionicons
                                    name={top10Expanded ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {top10Expanded ? (
                            <ScrollView style={styles.top10Expanded} showsVerticalScrollIndicator={false}>
                                {TOP_10_DATA.map((item) => (
                                    <View
                                        key={item.rank}
                                        style={[styles.top10ExpandedItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    >
                                        <TouchableOpacity
                                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                            onPress={() => {
                                                // Track Top 10 click
                                                analytics.logEvent(ANALYTICS_EVENTS.LINK_CLICK, {
                                                    link_id: item.id,
                                                    link_url: analytics.hashUrl(item.url),
                                                    link_title: item.title,
                                                    category: item.category,
                                                    position: item.rank - 1,
                                                    source: 'top10',
                                                    is_liked: item.isLiked || false,
                                                });

                                                if (Platform.OS === 'web') {
                                                    window.open(item.url, '_blank');
                                                } else {
                                                    setBrowserLink({ id: item.id, url: item.url, title: item.title, isLiked: item.isLiked || false, source: 'top10' });
                                                }
                                            }}
                                        >
                                            {/* Rank number only */}
                                            <View style={styles.rankBadge}>
                                                <Text style={[styles.rankNumber, { color: colors.text }]}>
                                                    {item.rank}
                                                </Text>
                                            </View>
                                            <Text style={[styles.top10ItemTitle, { color: colors.text }]} numberOfLines={1}>
                                                {item.title}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Rank change indicator (matching folded view) */}
                                        <View style={styles.rankChangeRight}>
                                            {item.rankChange === 'new' ? (
                                                <View style={[styles.newBadge, { backgroundColor: colors.accent }]}>
                                                    <Text style={styles.newBadgeText}>NEW</Text>
                                                </View>
                                            ) : item.rankChange === 'same' ? (
                                                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>-</Text>
                                            ) : (
                                                <View style={styles.rankChangeIndicator}>
                                                    <Ionicons
                                                        name={item.rankChange === 'up' ? 'arrow-up' : 'arrow-down'}
                                                        size={12}
                                                        color={item.rankChange === 'up' ? '#EF4444' : '#3B82F6'}
                                                    />
                                                    {item.rankDelta && (
                                                        <Text style={[
                                                            styles.rankDelta,
                                                            { color: item.rankChange === 'up' ? '#EF4444' : '#3B82F6' }
                                                        ]}>
                                                            {item.rankDelta}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : TOP_10_DATA.length > 0 ? (
                            <Animated.View style={[styles.top10Compact, { opacity: fadeAnim }]}>
                                <View style={[styles.top10CompactInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <TouchableOpacity
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                        onPress={() => {
                                            const item = TOP_10_DATA[currentTop10Index];

                                            // Track Top 10 click
                                            analytics.logEvent(ANALYTICS_EVENTS.LINK_CLICK, {
                                                link_id: item.id,
                                                link_url: analytics.hashUrl(item.url),
                                                link_title: item.title,
                                                category: item.category,
                                                position: item.rank - 1,
                                                source: 'top10',
                                                is_liked: item.isLiked || false,
                                            });

                                            if (Platform.OS === 'web') {
                                                window.open(item.url, '_blank');
                                            } else {
                                                setBrowserLink({ id: item.id, url: item.url, title: item.title, isLiked: item.isLiked || false, source: 'top10' });
                                            }
                                        }}
                                    >
                                        {/* Rank number only in compact view */}
                                        <View style={styles.rankBadge}>
                                            <Text style={[styles.rankNumber, { color: colors.text }]}>
                                                {TOP_10_DATA[currentTop10Index].rank}
                                            </Text>
                                        </View>
                                        <Text style={[styles.top10CompactTitle, { color: colors.text }]} numberOfLines={1}>
                                            {TOP_10_DATA[currentTop10Index].title}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Rank change indicator on far right in compact view */}
                                    <View style={styles.rankChangeRight}>
                                        {TOP_10_DATA[currentTop10Index].rankChange === 'new' ? (
                                            <View style={[styles.newBadge, { backgroundColor: colors.accent }]}>
                                                <Text style={styles.newBadgeText}>NEW</Text>
                                            </View>
                                        ) : TOP_10_DATA[currentTop10Index].rankChange === 'same' ? (
                                            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>-</Text>
                                        ) : (
                                            <View style={styles.rankChangeIndicator}>
                                                <Ionicons
                                                    name={TOP_10_DATA[currentTop10Index].rankChange === 'up' ? 'arrow-up' : 'arrow-down'}
                                                    size={12}
                                                    color={TOP_10_DATA[currentTop10Index].rankChange === 'up' ? '#EF4444' : '#3B82F6'}
                                                />
                                                {TOP_10_DATA[currentTop10Index].rankDelta && (
                                                    <Text style={[
                                                        styles.rankDelta,
                                                        { color: TOP_10_DATA[currentTop10Index].rankChange === 'up' ? '#EF4444' : '#3B82F6' }
                                                    ]}>
                                                        {TOP_10_DATA[currentTop10Index].rankDelta}
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </Animated.View>
                        ) : (
                            <View style={[styles.top10CompactInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>아직 인기 링크가 없습니다</Text>
                            </View>
                        )}

                    </View>

                    <ScrollView
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={handleRefresh}
                                tintColor={colors.accent}
                                colors={[colors.accent]}
                            />
                        }
                        onScroll={({ nativeEvent }) => {
                            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;

                            // Collapse Top 10 on scroll down
                            if (top10Expanded && contentOffset.y > 10) {
                                setTop10Expanded(false);
                            }

                            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
                            if (isCloseToBottom) {
                                loadMore();
                            }

                            // Track scroll depth
                            trackScrollDepth(nativeEvent);

                            // Track impressions
                            const impressionItems = filteredFeedData.map((item, index) => ({
                                id: item.id,
                                url: item.url,
                                title: item.title,
                                category: item.autoCategory,
                                position: index,
                                source: 'explore_feed' as const,
                            }));
                            trackImpressions(impressionItems, contentOffset.y);
                        }}
                        scrollEventThrottle={400}
                    >
                        {/* Featured Carousel */}
                        <View style={styles.featuredSection}>
                            <View style={styles.sectionTitleContainer}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>추천 링크</Text>
                            </View>
                            {FEATURED_DATA.length > 0 ? (
                                <>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        snapToInterval={336} // 320 + 16 (margin)
                                        decelerationRate="fast"
                                        snapToAlignment="start"
                                        onMomentumScrollEnd={(event) => {
                                            const index = Math.round(event.nativeEvent.contentOffset.x / 336);
                                            setFeaturedIndex(index);
                                        }}
                                        contentContainerStyle={styles.featuredCarouselContent}
                                    >
                                        {FEATURED_DATA.map((item, index) => renderFeedItem(item, true, index, 'featured'))}
                                    </ScrollView>
                                    <View style={styles.carouselDots}>
                                        {FEATURED_DATA.map((_, index) => (
                                            <View
                                                key={index}
                                                style={[
                                                    styles.dot,
                                                    {
                                                        backgroundColor: index === featuredIndex ? colors.accent : colors.border,
                                                        width: index === featuredIndex ? 20 : 6,
                                                    }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                </>
                            ) : (
                                <View style={{ paddingHorizontal: 20, paddingVertical: 30 }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                                        추천 링크가 아직 없습니다
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Feed Section with Category Filter */}
                        <View style={styles.feedSection}>
                            <View style={styles.sectionTitleContainer}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>링크 피드</Text>
                            </View>

                            {/* Category Filter */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.categoryFilter}
                            >
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.filterChip,
                                            {
                                                backgroundColor: filterCategory === cat ? colors.accent : colors.card,
                                                borderColor: filterCategory === cat ? colors.accent : colors.border,
                                            }
                                        ]}
                                        onPress={() => setFilterCategory(cat)}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            { color: filterCategory === cat ? '#FFFFFF' : colors.text }
                                        ]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Feed Items */}
                            {filteredFeedData.length > 0 ? (
                                filteredFeedData.map((item, index) => renderFeedItem(item, false, index, 'explore_feed'))
                            ) : (
                                <View style={{ paddingHorizontal: 20, paddingVertical: 40 }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                                        링크 피드가 아직 없습니다
                                    </Text>
                                </View>
                            )}
                        </View>


                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Category Selection Modal */}
                    <Modal
                        visible={selectedSaveItem !== null}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setSelectedSaveItem(null)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                                    <TouchableOpacity onPress={() => setSelectedSaveItem(null)}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>취소</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.modalTitle, { color: colors.text }]}>카테고리 선택</Text>
                                    <View style={{ width: 50 }} />
                                </View>

                                <ScrollView style={styles.modalContent}>
                                    {categories.map((category) => (
                                        <TouchableOpacity
                                            key={category.id}
                                            style={[
                                                styles.categoryOption,
                                                {
                                                    backgroundColor: selectedCategory === category.id ? colors.accent + '20' : colors.card,
                                                    borderColor: selectedCategory === category.id ? colors.accent : colors.border,
                                                }
                                            ]}
                                            onPress={() => setSelectedCategory(category.id)}
                                        >
                                            <Text style={styles.categoryIcon}>{category.icon}</Text>
                                            <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                                            {selectedCategory === category.id && (
                                                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.modalFooter}>
                                    <TouchableOpacity
                                        style={[
                                            styles.confirmButton,
                                            {
                                                backgroundColor: selectedCategory ? colors.accent : colors.border,
                                                opacity: selectedCategory ? 1 : 0.5,
                                            }
                                        ]}
                                        onPress={handleConfirmSave}
                                        disabled={!selectedCategory}
                                    >
                                        <Text style={styles.confirmButtonText}>저장</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* Login Prompt Modal */}
                    <LoginPromptModal
                        visible={showLoginPrompt}
                        onClose={() => setShowLoginPrompt(false)}
                    />

                    {/* In-App Browser Modal (Native only) */}
                    <InAppBrowserModal
                        visible={browserLink !== null}
                        linkInfo={browserLink}
                        onClose={() => setBrowserLink(null)}
                        onLike={(id) => {
                            if (!session) {
                                setShowLoginPrompt(true);
                                return;
                            }
                            toggleLike(id);
                        }}
                        isLiked={browserLink ? feedData.find(f => f.id === browserLink.id)?.isLiked || TOP_10_DATA.find(t => t.id === browserLink.id)?.isLiked || false : false}
                        source={browserLink?.source || 'explore_feed'}
                    />
                </>
            )}

            {/* Toast Notification */}
            {showToast && (
                <View style={{
                    position: 'absolute',
                    bottom: 100,
                    alignSelf: 'center',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 24,
                    zIndex: 9999,
                }}>
                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>
                        {toastMessage}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stickyTop10: {
        borderBottomWidth: 1,
        paddingHorizontal: 20,
        paddingTop: 2,
        paddingBottom: 12,
    },
    top10Header: {
        marginBottom: 8,
    },
    top10HeaderButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    top10TitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    top10Title: {
        fontSize: 16,
        fontWeight: '700',
    },
    top10Compact: {
        marginBottom: 4,
    },
    top10CompactInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 10,
    },
    top10Expanded: {
        maxHeight: 300,
    },
    top10ExpandedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 6,
        gap: 10,
    },
    rankBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankNumber: {
        fontSize: 12,
        fontWeight: '700',
    },
    rankChangeContainer: {
        marginLeft: 0,
        width: 36,
        alignItems: 'center',
    },
    rankChangeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    rankDelta: {
        fontSize: 10,
        fontWeight: '700',
    },
    newBadge: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    newBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '700',
    },
    top10CompactTitle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    top10ItemTitle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    top10Actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 8,
    },
    rankChangeRight: {
        marginLeft: 12,
        minWidth: 30,
        alignItems: 'center',
    },
    actionIcon: {
        padding: 4,
    },
    top10ItemLikes: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    top10ItemLikesText: {
        fontSize: 11,
        fontWeight: '500',
    },
    featuredSection: {
        marginBottom: 24,
        paddingTop: 20,
    },
    sectionTitleContainer: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
    },
    featuredCarouselContent: {
        paddingLeft: 20,
    },
    carouselDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    feedSection: {
    },
    categoryFilter: {
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    carouselItem: {
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 16,
        overflow: 'hidden',
        width: 320,
    },
    feedItem: {
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        marginHorizontal: 20,
        overflow: 'hidden',
    },
    feedThumbnail: {
        width: '100%',
        height: 160,
    },
    feedContent: {
        padding: 12,
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    userAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    username: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    categoryTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryTagText: {
        fontSize: 10,
        fontWeight: '600',
    },
    feedTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 10,
    },
    feedActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    likeCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    likeCountText: {
        fontSize: 13,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    modalContent: {
        padding: 20,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        gap: 12,
    },
    categoryIcon: {
        fontSize: 20,
    },
    categoryName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    modalFooter: {
        padding: 20,
        paddingBottom: 30,
    },
    confirmButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
