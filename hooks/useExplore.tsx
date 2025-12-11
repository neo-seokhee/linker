// Explore Hook - Fetches live data for explore tab
import { supabase } from '@/utils/supabaseClient';
import { useCallback, useEffect, useState } from 'react';
import { getNicknamesByUserIds } from './useProfile';

// Types
export interface ExploreLink {
    id: string;
    url: string;
    title: string;
    thumbnail: string;
    description?: string;
    userId: string;
    userEmail?: string;
    userNickname?: string; // Added nickname from profiles
    likes: number;
    category: string;
    createdAt: string;
    isLiked: boolean;
}

export interface Top10Item extends ExploreLink {
    rank: number;
    weeklyLikeGain: number;
    rankChange: 'up' | 'down' | 'new' | 'same';
    rankDelta?: number;
}

interface UseExploreReturn {
    feedData: ExploreLink[];
    top10Data: Top10Item[];
    featuredData: ExploreLink[];
    isLoading: boolean;
    loadMoreFeed: () => Promise<void>;
    toggleLike: (linkId: string) => Promise<void>;
    refreshData: () => Promise<void>;
}

export function useExplore(): UseExploreReturn {
    const [feedData, setFeedData] = useState<ExploreLink[]>([]);
    const [top10Data, setTop10Data] = useState<Top10Item[]>([]);
    const [featuredData, setFeaturedData] = useState<ExploreLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feedOffset, setFeedOffset] = useState(0);
    const [likedLinks, setLikedLinks] = useState<Set<string>>(new Set());

    // Get current user
    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    };

    // Load user's liked links
    const loadUserLikes = async (userId: string) => {
        const { data } = await supabase
            .from('favorite_history')
            .select('link_id')
            .eq('user_id', userId);

        if (data) {
            setLikedLinks(new Set(data.map(item => item.link_id)));
        }
    };

    // Transform DB link to ExploreLink
    const transformLink = (dbLink: any, likeCount: number, isLiked: boolean, nickname?: string): ExploreLink => ({
        id: dbLink.id,
        url: dbLink.url,
        title: dbLink.custom_title || dbLink.og_title,
        thumbnail: dbLink.og_image || 'https://picsum.photos/400/200',
        description: dbLink.og_description,
        userId: dbLink.user_id,
        userEmail: dbLink.users?.email,
        userNickname: nickname || 'user',
        likes: likeCount,
        category: getCategoryFromLink(dbLink),
        createdAt: dbLink.created_at,
        isLiked,
    });

    // Auto-categorize based on URL domain when category is missing or '미분류'
    const getCategoryFromLink = (dbLink: any): string => {
        const categoryMap: Record<string, string> = {
            '00000000-0000-0000-0000-000000000002': '뉴스',
            '00000000-0000-0000-0000-000000000003': '쇼핑',
            '00000000-0000-0000-0000-000000000004': '아티클',
        };

        const mappedCategory = categoryMap[dbLink.category_id];
        if (mappedCategory) return mappedCategory;

        // Auto-categorize based on URL domain
        const url = (dbLink.url || '').toLowerCase();

        // News sites
        if (url.includes('news') || url.includes('bbc') || url.includes('cnn') ||
            url.includes('yonhap') || url.includes('hani') || url.includes('chosun') ||
            url.includes('joongang') || url.includes('donga')) {
            return '뉴스';
        }

        // Shopping sites
        if (url.includes('shop') || url.includes('store') || url.includes('coupang') ||
            url.includes('gmarket') || url.includes('11st') || url.includes('amazon') ||
            url.includes('auction') || url.includes('aliexpress')) {
            return '쇼핑';
        }

        // Blog/Article sites
        if (url.includes('blog') || url.includes('medium') || url.includes('velog') ||
            url.includes('tistory') || url.includes('brunch') || url.includes('notion')) {
            return '블로그';
        }

        // Video sites
        if (url.includes('youtube') || url.includes('youtu.be') || url.includes('vimeo') ||
            url.includes('twitch') || url.includes('netflix')) {
            return '영상';
        }

        // Social media
        if (url.includes('twitter') || url.includes('instagram') || url.includes('facebook') ||
            url.includes('tiktok') || url.includes('threads')) {
            return 'SNS';
        }

        // Tech sites
        if (url.includes('github') || url.includes('stackoverflow') || url.includes('dev.to') ||
            url.includes('gitbook') || url.includes('docs.') || url.includes('developer')) {
            return '개발';
        }

        return '일반';
    };

    // Fetch public feed (latest)
    const fetchFeed = async (offset: number = 0, limit: number = 10) => {
        const user = await getCurrentUser();

        // Try to get public links (with is_public column if it exists)
        // If the column doesn't exist, just get all links
        let links: any[] = [];

        // First try with is_public filter
        const { data: publicLinks, error: publicError } = await supabase
            .from('links')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (publicError) {
            // If is_public column doesn't exist, get all links
            console.log('is_public column not found, fetching all links');
            const { data: allLinks, error: allError } = await supabase
                .from('links')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (allError || !allLinks) {
                console.error('Error fetching feed:', allError);
                return [];
            }
            links = allLinks;
        } else {
            links = publicLinks || [];
        }

        if (links.length === 0) {
            return [];
        }

        // Get like counts for these links (if favorite_history table exists)
        const linkIds = links.map(l => l.id);
        const likeCountMap: Record<string, number> = {};

        try {
            const { data: likeCounts } = await supabase
                .from('favorite_history')
                .select('link_id')
                .in('link_id', linkIds);

            if (likeCounts) {
                likeCounts.forEach(lc => {
                    likeCountMap[lc.link_id] = (likeCountMap[lc.link_id] || 0) + 1;
                });
            }
        } catch (e) {
            // favorite_history table might not exist yet
            console.log('favorite_history table not found');
        }

        // Get nicknames for all link owners
        const userIds = links.map(l => l.user_id).filter(Boolean);
        const nicknameMap = await getNicknamesByUserIds(userIds);

        return links.map(link =>
            transformLink(link, likeCountMap[link.id] || 0, likedLinks.has(link.id), nicknameMap[link.user_id])
        );
    };

    // Fetch Top 10 by 7-day like increment
    const fetchTop10 = async () => {
        // Try to get from favorite_history if it exists
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: recentFavorites, error } = await supabase
                .from('favorite_history')
                .select('link_id')
                .gte('favorited_at', sevenDaysAgo.toISOString());

            if (error) {
                console.log('favorite_history table not found, skipping top 10');
                return [];
            }

            // Count by link_id
            const likeCountMap: Record<string, number> = {};
            if (recentFavorites) {
                recentFavorites.forEach(fav => {
                    likeCountMap[fav.link_id] = (likeCountMap[fav.link_id] || 0) + 1;
                });
            }

            // Sort and get top 10
            const sortedLinkIds = Object.entries(likeCountMap)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([id]) => id);

            if (sortedLinkIds.length === 0) {
                return [];
            }

            // Fetch link details (without is_public filter - column might not exist)
            const { data: links } = await supabase
                .from('links')
                .select('*')
                .in('id', sortedLinkIds);

            if (!links) return [];

            // Build Top 10 with ranks
            const top10: Top10Item[] = sortedLinkIds.map((linkId, index) => {
                const link = links.find(l => l.id === linkId);
                if (!link) return null;

                return {
                    ...transformLink(link, likeCountMap[linkId] || 0, likedLinks.has(linkId)),
                    rank: index + 1,
                    weeklyLikeGain: likeCountMap[linkId] || 0,
                    rankChange: 'same' as const,
                    rankDelta: undefined,
                };
            }).filter(Boolean) as Top10Item[];

            return top10;
        } catch (e) {
            console.log('Error in fetchTop10:', e);
            return [];
        }
    };

    // Fetch featured links (admin-selected)
    const fetchFeatured = async () => {
        try {
            // Try to get featured links (requires is_featured column)
            const { data: links, error } = await supabase
                .from('links')
                .select('*')
                .eq('is_featured', true)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                // is_featured column doesn't exist yet
                console.log('is_featured column not found, skipping featured');
                return [];
            }

            if (!links || links.length === 0) {
                return [];
            }

            // Get like counts (if favorite_history exists)
            const linkIds = links.map(l => l.id);
            const likeCountMap: Record<string, number> = {};

            try {
                const { data: likeCounts } = await supabase
                    .from('favorite_history')
                    .select('link_id')
                    .in('link_id', linkIds);

                if (likeCounts) {
                    likeCounts.forEach(lc => {
                        likeCountMap[lc.link_id] = (likeCountMap[lc.link_id] || 0) + 1;
                    });
                }
            } catch (e) {
                // favorite_history table might not exist yet
            }

            return links.map(link =>
                transformLink(link, likeCountMap[link.id] || 0, likedLinks.has(link.id))
            );
        } catch (e) {
            console.log('Error in fetchFeatured:', e);
            return [];
        }
    };

    // Toggle like on a link
    const toggleLike = async (linkId: string) => {
        const user = await getCurrentUser();
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        const isCurrentlyLiked = likedLinks.has(linkId);

        if (isCurrentlyLiked) {
            // Remove like
            await supabase
                .from('favorite_history')
                .delete()
                .eq('link_id', linkId)
                .eq('user_id', user.id);

            setLikedLinks(prev => {
                const newSet = new Set(prev);
                newSet.delete(linkId);
                return newSet;
            });
        } else {
            // Add like
            await supabase
                .from('favorite_history')
                .insert({
                    link_id: linkId,
                    user_id: user.id,
                });

            setLikedLinks(prev => new Set(prev).add(linkId));
        }

        // Update UI state
        setFeedData(prev => prev.map(item =>
            item.id === linkId
                ? { ...item, likes: item.likes + (isCurrentlyLiked ? -1 : 1), isLiked: !isCurrentlyLiked }
                : item
        ));
        setTop10Data(prev => prev.map(item =>
            item.id === linkId
                ? { ...item, likes: item.likes + (isCurrentlyLiked ? -1 : 1), isLiked: !isCurrentlyLiked }
                : item
        ));
        setFeaturedData(prev => prev.map(item =>
            item.id === linkId
                ? { ...item, likes: item.likes + (isCurrentlyLiked ? -1 : 1), isLiked: !isCurrentlyLiked }
                : item
        ));
    };

    // Load more feed items
    const loadMoreFeed = async () => {
        const newOffset = feedOffset + 10;
        const newItems = await fetchFeed(newOffset, 10);
        setFeedData(prev => [...prev, ...newItems]);
        setFeedOffset(newOffset);
    };

    // Refresh all data
    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = await getCurrentUser();
            if (user) {
                await loadUserLikes(user.id);
            }

            const [feed, top10, featured] = await Promise.all([
                fetchFeed(0, 10),
                fetchTop10(),
                fetchFeatured(),
            ]);

            setFeedData(feed);
            setTop10Data(top10);
            setFeaturedData(featured);
            setFeedOffset(0);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        refreshData();
    }, []);

    return {
        feedData,
        top10Data,
        featuredData,
        isLoading,
        loadMoreFeed,
        toggleLike,
        refreshData,
    };
}
