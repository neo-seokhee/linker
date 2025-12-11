// Explore Hook - Fetches live data for explore tab
import { supabase } from '@/utils/supabaseClient';
import { useCallback, useEffect, useState } from 'react';
import { getProfilesByUserIds } from './useProfile';
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
    userProfileImage?: string; // User's profile image
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
    const transformLink = (dbLink: any, likeCount: number, isLiked: boolean, nickname?: string, profileImage?: string): ExploreLink => {
        // Generate a deterministic fallback image based on URL domain
        let fallbackImage = '';
        try {
            const domain = new URL(dbLink.url).hostname.replace('www.', '');
            fallbackImage = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
        } catch {
            fallbackImage = 'https://www.google.com/s2/favicons?domain=link.com&sz=256';
        }

        return {
            id: dbLink.id,
            url: dbLink.url,
            title: dbLink.custom_title || dbLink.og_title,
            thumbnail: dbLink.og_image || fallbackImage,
            description: dbLink.og_description,
            userId: dbLink.user_id,
            userEmail: dbLink.users?.email,
            userNickname: nickname || 'user',
            userProfileImage: profileImage || undefined,
            likes: likeCount,
            category: getCategoryFromLink(dbLink),
            createdAt: dbLink.created_at,
            isLiked,
        };
    };

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

        // Get curated links that should show in feed
        const { data: curatedLinks } = await supabase
            .from('curated_links')
            .select('*')
            .eq('show_in_feed', true)
            .order('created_at', { ascending: false });

        // Get profiles (nickname + avatar) for all link owners
        const userIds = links.map(l => l.user_id).filter(Boolean);
        const profileMap = await getProfilesByUserIds(userIds);

        // Transform user links
        const userFeedLinks = links.map(link => {
            const profile = profileMap[link.user_id];
            return transformLink(
                link,
                likeCountMap[link.id] || 0,
                likedLinks.has(link.id),
                profile?.nickname,
                profile?.avatarUrl
            );
        });

        // Transform curated links
        const curatedFeedLinks = (curatedLinks || []).map(curated => transformLink(
            {
                id: curated.id,
                url: curated.url,
                og_title: curated.title,
                custom_title: curated.title,
                og_image: curated.thumbnail,
                og_description: curated.description,
                user_id: null,
                category_id: null,
                created_at: curated.created_at,
            },
            0,
            false,
            curated.nickname || '에디터 추천',
            curated.profile_image
        ));

        // Combine and sort by created_at
        const allLinks = [...userFeedLinks, ...curatedFeedLinks].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return allLinks;
    };

    // Fetch Top 10 by 7-day like increment + boost score (including curated links)
    const fetchTop10 = async () => {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Get 7-day likes
            const { data: recentFavorites } = await supabase
                .from('favorite_history')
                .select('link_id')
                .gte('favorited_at', sevenDaysAgo.toISOString());

            // Count by link_id
            const likeCountMap: Record<string, number> = {};
            if (recentFavorites) {
                recentFavorites.forEach(fav => {
                    likeCountMap[fav.link_id] = (likeCountMap[fav.link_id] || 0) + 1;
                });
            }

            // Get ALL links that either have likes OR have boost_score > 0
            const likedLinkIds = Object.keys(likeCountMap);

            // Get links with likes
            let linksWithLikes: any[] = [];
            if (likedLinkIds.length > 0) {
                const { data } = await supabase
                    .from('links')
                    .select('*')
                    .in('id', likedLinkIds);
                linksWithLikes = data || [];
            }

            // Get links with boost_score > 0 (even if no likes)
            const { data: boostedLinks } = await supabase
                .from('links')
                .select('*')
                .gt('boost_score', 0);

            // Merge both lists (avoid duplicates)
            const allLinkIds = new Set<string>();
            const allUserLinks: any[] = [];

            linksWithLikes.forEach(link => {
                if (!allLinkIds.has(link.id)) {
                    allLinkIds.add(link.id);
                    allUserLinks.push(link);
                }
            });

            boostedLinks?.forEach(link => {
                if (!allLinkIds.has(link.id)) {
                    allLinkIds.add(link.id);
                    allUserLinks.push(link);
                }
            });

            // Get curated links with boost_score > 0 (any curated link with boost score should appear in Top 10)
            const { data: curatedLinks } = await supabase
                .from('curated_links')
                .select('*')
                .gt('boost_score', 0);

            // Get profiles for user links
            const userIds = allUserLinks.map(l => l.user_id).filter(Boolean);
            const profileMap = await getProfilesByUserIds(userIds);

            // Combine all links with scores
            type ScoredItem = { link: any; source: 'user' | 'curated'; totalScore: number; likes: number; nickname?: string; profileImage?: string };
            const scoredItems: ScoredItem[] = [];

            // Add user links
            allUserLinks.forEach(link => {
                const likes = likeCountMap[link.id] || 0;
                const boost = link.boost_score || 0;
                const profile = profileMap[link.user_id];
                scoredItems.push({
                    link,
                    source: 'user',
                    totalScore: likes + boost,
                    likes,
                    nickname: profile?.nickname,
                    profileImage: profile?.avatarUrl,
                });
            });

            // Add curated links
            curatedLinks?.forEach(curated => {
                scoredItems.push({
                    link: {
                        id: curated.id,
                        url: curated.url,
                        og_title: curated.title,
                        custom_title: curated.title,
                        og_image: curated.thumbnail,
                        og_description: curated.description,
                        user_id: null,
                        category_id: null,
                        created_at: curated.created_at,
                    },
                    source: 'curated',
                    totalScore: curated.boost_score || 0,
                    likes: 0,
                    nickname: curated.nickname || '에디터 추천',
                    profileImage: curated.profile_image,
                });
            });

            // Sort by total score and take top 10
            scoredItems.sort((a, b) => b.totalScore - a.totalScore);
            const top10Items = scoredItems.slice(0, 10);

            // Build Top 10 result
            const top10: Top10Item[] = top10Items.map((item, index) => ({
                ...transformLink(item.link, item.likes, likedLinks.has(item.link.id), item.nickname, item.profileImage),
                rank: index + 1,
                weeklyLikeGain: item.likes,
                rankChange: 'same' as const,
                rankDelta: undefined,
            }));

            return top10;
        } catch (e) {
            console.log('Error in fetchTop10:', e);
            return [];
        }
    };

    // Fetch featured links (admin-selected user links + curated links)
    const fetchFeatured = async () => {
        try {
            // Get featured user links
            const { data: userLinks } = await supabase
                .from('links')
                .select('*')
                .eq('is_featured', true)
                .order('created_at', { ascending: false })
                .limit(10);

            // Get curated featured links
            const { data: curatedLinks } = await supabase
                .from('curated_links')
                .select('*')
                .eq('show_in_featured', true)
                .order('created_at', { ascending: false });

            // Get profiles for user featured links
            const userIds = (userLinks || []).map(l => l.user_id).filter(Boolean);
            const profileMap = await getProfilesByUserIds(userIds);

            // Get like counts for user links
            const userLinkIds = (userLinks || []).map(l => l.id);
            const likeCountMap: Record<string, number> = {};

            if (userLinkIds.length > 0) {
                try {
                    const { data: likeCounts } = await supabase
                        .from('favorite_history')
                        .select('link_id')
                        .in('link_id', userLinkIds);

                    if (likeCounts) {
                        likeCounts.forEach(lc => {
                            likeCountMap[lc.link_id] = (likeCountMap[lc.link_id] || 0) + 1;
                        });
                    }
                } catch (e) {
                    // favorite_history table might not exist yet
                }
            }

            // Transform curated links
            const curatedFeatured: ExploreLink[] = (curatedLinks || []).map(curated =>
                transformLink(
                    {
                        id: curated.id,
                        url: curated.url,
                        og_title: curated.title,
                        custom_title: curated.title,
                        og_image: curated.thumbnail,
                        og_description: curated.description,
                        user_id: null,
                        category_id: null,
                        created_at: curated.created_at,
                    },
                    0,
                    false,
                    curated.nickname || '에디터 추천',
                    curated.profile_image
                )
            );

            // Transform user featured links with profile data
            const userFeatured: ExploreLink[] = (userLinks || []).map(link => {
                const profile = profileMap[link.user_id];
                return transformLink(
                    link,
                    likeCountMap[link.id] || 0,
                    likedLinks.has(link.id),
                    profile?.nickname,
                    profile?.avatarUrl
                );
            });

            // Combine with curated first (higher priority)
            return [...curatedFeatured, ...userFeatured].slice(0, 10);
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
