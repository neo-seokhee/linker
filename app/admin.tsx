// Admin Page - Complete Admin Dashboard
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { fetchOGData, isValidUrl, normalizeUrl } from '@/utils/ogParser';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ADMIN_PASSWORD = '71996565';

type AdminSection = 'home' | 'links' | 'featured' | 'users' | 'top10' | 'curated' | 'avatars' | 'feed_sources';
type LinkFilter = 'all' | 'featured' | 'hidden';

interface AdminLink {
    id: string;
    url: string;
    og_title: string;
    custom_title?: string;
    og_image: string | null;
    is_featured: boolean;
    is_public: boolean;
    created_at: string;
    user_id: string | null;
    category_id: string | null;
    boost_score?: number;
    // Joined data
    author_nickname?: string;
    category_name?: string;
    likes_count?: number;
}

interface CuratedLink {
    id: string;
    url: string;
    title: string;
    thumbnail: string | null;
    description: string | null;
    editor_id: string | null;
    nickname: string | null;
    profile_image: string | null;
    show_in_feed: boolean;
    show_in_featured: boolean;
    show_in_top10: boolean;
    boost_score: number;
    category: string;
    created_at: string;
}

interface CuratedEditor {
    id: string;
    nickname: string;
    profile_image: string | null;
    description: string | null;
    created_at: string;
}

interface FeedSource {
    id: string;
    name: string;
    source_type: 'rss' | 'newsletter' | 'api' | 'scraper';
    url: string;
    email_address: string | null;
    email_parser_config: any;
    editor_nickname: string;
    editor_profile_image: string | null;
    category: string;
    show_in_feed: boolean;
    show_in_featured: boolean;
    boost_score: number;
    is_active: boolean;
    collection_interval_hours: number;
    max_items_per_collection: number;
    keywords_include: string[] | null;
    keywords_exclude: string[] | null;
    last_collected_at: string | null;
    total_items_collected: number;
    actual_items_count?: number; // Actual count from curated_links
    created_at: string;
}

export default function AdminPage() {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [currentSection, setCurrentSection] = useState<AdminSection>('home');
    const [links, setLinks] = useState<AdminLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState<LinkFilter>('all');
    const [userCount, setUserCount] = useState(0);
    const [top10Preview, setTop10Preview] = useState<AdminLink[]>([]);
    const [featuredFilter, setFeaturedFilter] = useState<'all' | 'user' | 'curated'>('all');

    // Curated links state
    const [curatedLinks, setCuratedLinks] = useState<CuratedLink[]>([]);
    const [newCuratedUrl, setNewCuratedUrl] = useState('');
    const [newCuratedTitle, setNewCuratedTitle] = useState('');
    const [newCuratedThumbnail, setNewCuratedThumbnail] = useState('');
    const [newCuratedNickname, setNewCuratedNickname] = useState('');
    const [newCuratedProfileImage, setNewCuratedProfileImage] = useState('');
    const [newCuratedCategory, setNewCuratedCategory] = useState('일반');
    const [newCuratedBoost, setNewCuratedBoost] = useState('0');
    const [showInFeed, setShowInFeed] = useState(true);
    const [showInFeatured, setShowInFeatured] = useState(false);
    const [showInTop10, setShowInTop10] = useState(false);
    const [isFetchingOG, setIsFetchingOG] = useState(false);

    // Default avatars state
    const [defaultAvatars, setDefaultAvatars] = useState<{ id: string; url: string; label: string; order_index: number }[]>([]);
    const [newAvatarUrl, setNewAvatarUrl] = useState('');
    const [newAvatarLabel, setNewAvatarLabel] = useState('');

    // Curated link editing state
    const [editingCuratedId, setEditingCuratedId] = useState<string | null>(null);
    const [editCuratedTitle, setEditCuratedTitle] = useState('');
    const [editCuratedThumbnail, setEditCuratedThumbnail] = useState('');
    const [editCuratedBoost, setEditCuratedBoost] = useState('0');
    const [editShowInFeed, setEditShowInFeed] = useState(true);
    const [editShowInFeatured, setEditShowInFeatured] = useState(false);
    const [editShowInTop10, setEditShowInTop10] = useState(false);
    const [editCuratedEditorId, setEditCuratedEditorId] = useState<string | null>(null);
    const [editCuratedNickname, setEditCuratedNickname] = useState('');
    const [editCuratedProfileImage, setEditCuratedProfileImage] = useState('');

    // Top 10 full data with scores
    const [top10FullData, setTop10FullData] = useState<(AdminLink & { source: 'user' | 'curated', totalScore: number })[]>([]);

    // Curated Editors state
    const [curatedEditors, setCuratedEditors] = useState<CuratedEditor[]>([]);
    const [newEditorNickname, setNewEditorNickname] = useState('');
    const [newEditorProfileImage, setNewEditorProfileImage] = useState('');
    const [newEditorDescription, setNewEditorDescription] = useState('');
    const [selectedEditorId, setSelectedEditorId] = useState<string | null>(null);

    // Feed Sources state
    const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
    const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
    const [sourceLinks, setSourceLinks] = useState<{ [key: string]: AdminLink[] }>({});
    const [newSourceName, setNewSourceName] = useState('');
    const [newSourceType, setNewSourceType] = useState<'rss' | 'newsletter' | 'api' | 'scraper'>('rss');
    const [newSourceUrl, setNewSourceUrl] = useState('');
    const [newSourceEditorNickname, setNewSourceEditorNickname] = useState('');
    const [newSourceEditorImage, setNewSourceEditorImage] = useState('');
    const [newSourceCategory, setNewSourceCategory] = useState('일반');
    const [newSourceBoost, setNewSourceBoost] = useState('0');
    const [newSourceInterval, setNewSourceInterval] = useState('6');
    const [newSourceMaxItems, setNewSourceMaxItems] = useState('10');
    const [newSourceShowInFeed, setNewSourceShowInFeed] = useState(true);
    const [newSourceShowInFeatured, setNewSourceShowInFeatured] = useState(false);
    const [selectedSourceEditorId, setSelectedSourceEditorId] = useState<string | null>(null);

    // Edit feed source state
    const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
    const [editSourceName, setEditSourceName] = useState('');
    const [editSourceType, setEditSourceType] = useState<'rss' | 'newsletter' | 'api' | 'scraper'>('rss');
    const [editSourceUrl, setEditSourceUrl] = useState('');
    const [editSourceEditorNickname, setEditSourceEditorNickname] = useState('');
    const [editSourceEditorImage, setEditSourceEditorImage] = useState('');
    const [editSourceCategory, setEditSourceCategory] = useState('일반');
    const [editSourceBoost, setEditSourceBoost] = useState('0');
    const [editSourceInterval, setEditSourceInterval] = useState('6');
    const [editSourceMaxItems, setEditSourceMaxItems] = useState('10');
    const [editSourceShowInFeed, setEditSourceShowInFeed] = useState(true);
    const [editSourceShowInFeatured, setEditSourceShowInFeatured] = useState(false);
    const [editSelectedSourceEditorId, setEditSelectedSourceEditorId] = useState<string | null>(null);

    // Auto-fetch OG data when URL changes
    const fetchURLMetadata = useCallback(async (url: string) => {
        const normalizedUrl = normalizeUrl(url.trim());
        if (!isValidUrl(normalizedUrl)) return;

        setIsFetchingOG(true);
        try {
            const data = await fetchOGData(normalizedUrl);
            if (data) {
                setNewCuratedTitle(data.title || '');
                setNewCuratedThumbnail(data.image || '');
            }
        } catch (e) {
            console.log('Failed to fetch OG data:', e);
        } finally {
            setIsFetchingOG(false);
        }
    }, []);

    // Load data when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadLinks();
            loadStats();
        }
    }, [isAuthenticated, filter]);

    // Load curated links when curated or featured section is opened
    useEffect(() => {
        if (isAuthenticated && (currentSection === 'curated' || currentSection === 'featured')) {
            loadCuratedLinks();
            loadEditors();
        }
    }, [isAuthenticated, currentSection]);

    // Load Top 10 full data when top10 section is opened
    useEffect(() => {
        if (isAuthenticated && currentSection === 'top10') {
            loadTop10Full();
        }
    }, [isAuthenticated, currentSection]);

    // Load avatars when avatars section is opened
    useEffect(() => {
        if (isAuthenticated && currentSection === 'avatars') {
            loadDefaultAvatars();
        }
    }, [isAuthenticated, currentSection]);

    // Load feed sources when feed_sources section is opened
    useEffect(() => {
        if (isAuthenticated && currentSection === 'feed_sources') {
            loadFeedSources();
            loadEditors();
        }
    }, [isAuthenticated, currentSection]);

    const handleLogin = () => {
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setPasswordError('');
        } else {
            setPasswordError('비밀번호가 틀렸습니다');
        }
    };

    const loadStats = async () => {
        // Load user count
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        setUserCount(count || 0);

        // Load top 10 preview
        const { data: topLinks } = await supabase
            .from('favorite_history')
            .select('link_id')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        if (topLinks) {
            const likeCounts: Record<string, number> = {};
            topLinks.forEach(item => {
                likeCounts[item.link_id] = (likeCounts[item.link_id] || 0) + 1;
            });

            const topIds = Object.entries(likeCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([id]) => id);

            if (topIds.length > 0) {
                const { data: topLinksData } = await supabase
                    .from('links')
                    .select('id, og_title')
                    .in('id', topIds);

                setTop10Preview(topLinksData as AdminLink[] || []);
            }
        }
    };

    // Load curated links
    const loadCuratedLinks = async () => {
        const { data, error } = await supabase
            .from('curated_links')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Error loading curated links:', error.message);
            return;
        }
        setCuratedLinks(data || []);
    };

    // Load curated editors
    const loadEditors = async () => {
        const { data, error } = await supabase
            .from('curated_editors')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Error loading editors:', error.message);
            return;
        }
        setCuratedEditors(data || []);
    };

    // Add new editor
    const addEditor = async () => {
        if (!newEditorNickname.trim()) {
            alert('닉네임을 입력해주세요.');
            return;
        }

        const { error } = await supabase.from('curated_editors').insert({
            nickname: newEditorNickname.trim(),
            profile_image: newEditorProfileImage.trim() || null,
            description: newEditorDescription.trim() || null,
        });

        if (error) {
            alert('추가 실패: ' + error.message);
        } else {
            setNewEditorNickname('');
            setNewEditorProfileImage('');
            setNewEditorDescription('');
            loadEditors();
        }
    };

    // Delete editor
    const deleteEditor = async (id: string) => {
        const confirmed = typeof window !== 'undefined'
            ? window.confirm('이 에디터를 삭제하시겠습니까?')
            : true;
        if (!confirmed) return;

        const { error } = await supabase.from('curated_editors').delete().eq('id', id);
        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            loadEditors();
        }
    };

    // Load Top 10 with full score data
    const loadTop10Full = async () => {
        setIsLoading(true);
        try {
            // Get 7-day likes
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: recentLikes } = await supabase
                .from('favorite_history')
                .select('link_id')
                .gte('favorited_at', sevenDaysAgo);

            const likeCountMap: Record<string, number> = {};
            recentLikes?.forEach(item => {
                likeCountMap[item.link_id] = (likeCountMap[item.link_id] || 0) + 1;
            });

            // Get links with likes
            const likedLinkIds = Object.keys(likeCountMap);
            let linksWithLikes: any[] = [];
            if (likedLinkIds.length > 0) {
                const { data } = await supabase
                    .from('links')
                    .select('id, url, og_title, og_image, boost_score, user_id')
                    .in('id', likedLinkIds);
                linksWithLikes = data || [];
            }

            // Get links with boost_score > 0 (even if no likes)
            const { data: boostedLinks } = await supabase
                .from('links')
                .select('id, url, og_title, og_image, boost_score, user_id')
                .gt('boost_score', 0);

            // Merge both lists (avoid duplicates)
            const allLinkIds = new Set<string>();
            const userLinks: any[] = [];

            linksWithLikes.forEach(link => {
                if (!allLinkIds.has(link.id)) {
                    allLinkIds.add(link.id);
                    userLinks.push(link);
                }
            });

            boostedLinks?.forEach(link => {
                if (!allLinkIds.has(link.id)) {
                    allLinkIds.add(link.id);
                    userLinks.push(link);
                }
            });

            // Get curated links with boost_score > 0 (instead of show_in_top10 flag)
            const { data: curatedTop10 } = await supabase
                .from('curated_links')
                .select('*')
                .gt('boost_score', 0);

            // Combine and score
            const combinedData: (AdminLink & { source: 'user' | 'curated', totalScore: number })[] = [];

            // Add user links with scores
            userLinks.forEach(link => {
                const likes = likeCountMap[link.id] || 0;
                const boost = link.boost_score || 0;
                combinedData.push({
                    id: link.id,
                    url: link.url,
                    og_title: link.og_title,
                    og_image: link.og_image,
                    is_featured: false,
                    is_public: true,
                    created_at: '',
                    user_id: link.user_id,
                    category_id: '',
                    boost_score: boost,
                    likes_count: likes,
                    source: 'user',
                    totalScore: likes + boost,
                });
            });

            // Add curated links
            curatedTop10?.forEach(link => {
                combinedData.push({
                    id: link.id,
                    url: link.url,
                    og_title: link.title,
                    og_image: link.thumbnail,
                    is_featured: false,
                    is_public: true,
                    created_at: link.created_at,
                    user_id: '',
                    category_id: '',
                    boost_score: link.boost_score,
                    likes_count: 0,
                    source: 'curated',
                    totalScore: link.boost_score,
                });
            });

            // Sort by total score and take top 10
            combinedData.sort((a, b) => b.totalScore - a.totalScore);
            setTop10FullData(combinedData.slice(0, 10));
        } catch (e) {
            console.error('Error loading top 10:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // Add new curated link
    const addCuratedLink = async () => {
        if (!newCuratedUrl.trim() || !newCuratedTitle.trim()) {
            alert('URL과 제목을 입력해주세요.');
            return;
        }

        // If no editor selected, require manual nickname and profile image
        if (!selectedEditorId && (!newCuratedNickname.trim() || !newCuratedProfileImage.trim())) {
            alert('에디터를 선택하거나 유저 닉네임과 프로필 이미지를 모두 입력해주세요.');
            return;
        }

        // Get editor info if selected
        const selectedEditor = curatedEditors.find(e => e.id === selectedEditorId);

        const { error } = await supabase.from('curated_links').insert({
            url: newCuratedUrl.trim(),
            title: newCuratedTitle.trim(),
            thumbnail: newCuratedThumbnail.trim() || null,
            editor_id: selectedEditorId || null,
            nickname: selectedEditor?.nickname || newCuratedNickname.trim() || null,
            profile_image: selectedEditor?.profile_image || newCuratedProfileImage.trim() || null,
            category: newCuratedCategory,
            boost_score: parseInt(newCuratedBoost) || 0,
            show_in_feed: showInFeed,
            show_in_featured: showInFeatured,
            show_in_top10: showInTop10,
        });

        if (error) {
            alert('추가 실패: ' + error.message);
        } else {
            // Reset form
            setNewCuratedUrl('');
            setNewCuratedTitle('');
            setNewCuratedThumbnail('');
            setNewCuratedNickname('');
            setNewCuratedProfileImage('');
            setNewCuratedBoost('0');
            setSelectedEditorId(null);
            setShowInFeed(true);
            setShowInFeatured(false);
            setShowInTop10(false);
            loadCuratedLinks();
        }
    };

    // Delete curated link
    const deleteCuratedLink = async (id: string) => {
        const confirmed = typeof window !== 'undefined'
            ? window.confirm('이 큐레이션 링크를 삭제하시겠습니까?')
            : true;
        if (!confirmed) return;

        console.log('Attempting to delete curated link:', id);

        // Simple delete without .select()
        const { error } = await supabase
            .from('curated_links')
            .delete()
            .eq('id', id);

        console.log('Delete result - error:', error);

        if (error) {
            console.error('Delete error details:', JSON.stringify(error));
            alert('삭제 실패: ' + error.message + '\n(코드: ' + error.code + ')');
        } else {
            // Verify deletion by checking if item still exists
            const { data: checkData } = await supabase
                .from('curated_links')
                .select('id')
                .eq('id', id)
                .single();

            if (checkData) {
                alert('삭제 실패: 권한이 없어 삭제되지 않았습니다.');
            } else {
                loadCuratedLinks();
            }
        }
    };

    // ============ Default Avatars Functions ============
    const loadDefaultAvatars = async () => {
        const { data, error } = await supabase
            .from('default_avatars')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true });

        if (!error && data) {
            setDefaultAvatars(data);
        }
    };

    const addDefaultAvatar = async () => {
        if (!newAvatarUrl.trim()) {
            alert('URL을 입력해주세요.');
            return;
        }

        const maxOrder = defaultAvatars.length > 0
            ? Math.max(...defaultAvatars.map(a => a.order_index)) + 1
            : 0;

        const { error } = await supabase.from('default_avatars').insert({
            url: newAvatarUrl.trim(),
            label: '',  // Label is now optional/empty
            order_index: maxOrder,
        });

        if (error) {
            alert('추가 실패: ' + error.message);
        } else {
            setNewAvatarUrl('');
            loadDefaultAvatars();
        }
    };

    const deleteDefaultAvatar = async (id: string) => {
        const confirmed = typeof window !== 'undefined'
            ? window.confirm('이 아바타를 삭제하시겠습니까?')
            : true;
        if (!confirmed) return;

        const { error } = await supabase.from('default_avatars').delete().eq('id', id);
        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            loadDefaultAvatars();
        }
    };

    // ============ Feed Sources Functions ============
    const loadFeedSources = async () => {
        const { data, error } = await supabase
            .from('feed_sources')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Error loading feed sources:', error.message);
            return;
        }

        // Get actual count of collected links for each source
        const sourcesWithCounts = await Promise.all((data || []).map(async (source) => {
            const { count } = await supabase
                .from('curated_links')
                .select('*', { count: 'exact', head: true })
                .eq('nickname', source.editor_nickname);

            return {
                ...source,
                actual_items_count: count || 0
            };
        }));

        setFeedSources(sourcesWithCounts);
    };

    const addFeedSource = async () => {
        if (!newSourceName.trim() || !newSourceUrl.trim() || !newSourceEditorNickname.trim()) {
            alert('소스 이름, URL, 에디터 닉네임을 입력해주세요.');
            return;
        }

        const selectedEditor = curatedEditors.find(e => e.id === selectedSourceEditorId);

        const { error } = await supabase.from('feed_sources').insert({
            name: newSourceName.trim(),
            source_type: newSourceType,
            url: newSourceUrl.trim(),
            editor_nickname: selectedEditor?.nickname || newSourceEditorNickname.trim(),
            editor_profile_image: selectedEditor?.profile_image || newSourceEditorImage.trim() || null,
            category: newSourceCategory,
            boost_score: parseInt(newSourceBoost) || 0,
            show_in_feed: newSourceShowInFeed,
            show_in_featured: newSourceShowInFeatured,
            is_active: true,
            collection_interval_hours: parseInt(newSourceInterval) || 6,
            max_items_per_collection: parseInt(newSourceMaxItems) || 10,
        });

        if (error) {
            alert('추가 실패: ' + error.message);
        } else {
            // Reset form
            setNewSourceName('');
            setNewSourceUrl('');
            setNewSourceEditorNickname('');
            setNewSourceEditorImage('');
            setNewSourceBoost('0');
            setNewSourceInterval('6');
            setNewSourceMaxItems('10');
            setSelectedSourceEditorId(null);
            setNewSourceShowInFeed(true);
            setNewSourceShowInFeatured(false);
            loadFeedSources();
        }
    };

    const deleteFeedSource = async (id: string) => {
        const confirmed = typeof window !== 'undefined'
            ? window.confirm('이 피드 소스를 삭제하시겠습니까?')
            : true;
        if (!confirmed) return;

        const { error } = await supabase.from('feed_sources').delete().eq('id', id);
        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            loadFeedSources();
        }
    };

    const deleteFeedSourceLinks = async (sourceName: string) => {
        const confirmed = typeof window !== 'undefined'
            ? window.confirm(`"${sourceName}"에서 수집된 모든 링크를 삭제하시겠습니까?`)
            : true;
        if (!confirmed) return;

        // curated_links에서 해당 소스의 nickname과 일치하는 링크 모두 삭제
        const source = feedSources.find(s => s.name === sourceName);
        if (!source) return;

        const { error } = await supabase
            .from('curated_links')
            .delete()
            .eq('nickname', source.editor_nickname);

        if (error) {
            alert('링크 삭제 실패: ' + error.message);
        } else {
            alert('링크가 삭제되었습니다.');
            loadFeedSources(); // Refresh to update counts
        }
    };

    const loadSourceLinks = async (sourceId: string, editorNickname: string) => {
        const { data, error } = await supabase
            .from('curated_links')
            .select('*')
            .eq('nickname', editorNickname)
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Error loading source links:', error.message);
            return;
        }

        // Transform to AdminLink format
        const links: AdminLink[] = (data || []).map(link => ({
            id: link.id,
            url: link.url,
            og_title: link.title,
            og_image: link.thumbnail,
            is_featured: link.show_in_featured,
            is_public: true,
            created_at: link.created_at,
            user_id: null,
            category_id: null,
            boost_score: link.boost_score || 0,
            author_nickname: link.nickname,
            category_name: link.category || '일반',
            likes_count: 0,
        }));

        setSourceLinks(prev => ({ ...prev, [sourceId]: links }));
    };

    const toggleSourceExpanded = async (sourceId: string, editorNickname: string) => {
        if (expandedSourceId === sourceId) {
            setExpandedSourceId(null);
        } else {
            setExpandedSourceId(sourceId);
            // Load links if not already loaded
            if (!sourceLinks[sourceId]) {
                await loadSourceLinks(sourceId, editorNickname);
            }
        }
    };

    const deleteSourceLink = async (sourceId: string, linkId: string) => {
        const confirmed = typeof window !== 'undefined'
            ? window.confirm('이 링크를 삭제하시겠습니까?')
            : true;
        if (!confirmed) return;

        const { error } = await supabase
            .from('curated_links')
            .delete()
            .eq('id', linkId);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            // Update local state
            setSourceLinks(prev => ({
                ...prev,
                [sourceId]: prev[sourceId].filter(link => link.id !== linkId)
            }));
            // Reload feed sources to update count
            loadFeedSources();
        }
    };

    const toggleFeedSourceActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('feed_sources')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) {
            alert('업데이트 실패: ' + error.message);
        } else {
            setFeedSources(prev => prev.map(source =>
                source.id === id ? { ...source, is_active: !currentStatus } : source
            ));
        }
    };

    const testFeedCollection = async () => {
        const functionUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') + '/functions/v1/feed-collector';
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        if (!functionUrl || !anonKey) {
            alert('Supabase 설정이 올바르지 않습니다.');
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (response.ok) {
                alert(`수집 완료!\n\n${JSON.stringify(result, null, 2)}`);
                loadFeedSources(); // Reload to see updated stats
            } else {
                alert(`수집 실패: ${result.error || '알 수 없는 오류'}`);
            }
        } catch (error: any) {
            alert(`Edge Function 호출 실패: ${error.message}\n\n먼저 Edge Function을 배포해야 합니다.`);
        } finally {
            setIsLoading(false);
        }
    };

    const collectSingleFeedSource = async (sourceId: string, sourceName: string) => {
        const functionUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') + '/functions/v1/feed-collector';
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        if (!functionUrl || !anonKey) {
            alert('Supabase 설정이 올바르지 않습니다.');
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ source_id: sourceId }),
            });

            const result = await response.json();

            if (response.ok) {
                const collected = result.results?.[0]?.collected || 0;
                const skipped = result.results?.[0]?.skipped || 0;
                const error = result.results?.[0]?.error;

                if (error) {
                    alert(`"${sourceName}" 수집 실패\n\n에러: ${error}`);
                } else {
                    alert(`"${sourceName}" 수집 완료!\n\n새로 수집: ${collected}개\n중복 스킵: ${skipped}개`);
                }
                loadFeedSources(); // Reload to see updated stats
            } else {
                alert(`수집 실패: ${result.error || '알 수 없는 오류'}`);
            }
        } catch (error: any) {
            alert(`Edge Function 호출 실패: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const updateFeedSource = async () => {
        if (!editingSourceId) return;

        const selectedEditor = curatedEditors.find(e => e.id === editSelectedSourceEditorId);

        const { error } = await supabase
            .from('feed_sources')
            .update({
                name: editSourceName.trim(),
                source_type: editSourceType,
                url: editSourceUrl.trim(),
                editor_nickname: selectedEditor?.nickname || editSourceEditorNickname.trim(),
                editor_profile_image: selectedEditor?.profile_image || editSourceEditorImage.trim() || null,
                category: editSourceCategory,
                boost_score: parseInt(editSourceBoost) || 0,
                show_in_feed: editSourceShowInFeed,
                show_in_featured: editSourceShowInFeatured,
                collection_interval_hours: parseInt(editSourceInterval) || 6,
                max_items_per_collection: parseInt(editSourceMaxItems) || 10,
            })
            .eq('id', editingSourceId);

        if (error) {
            alert('수정 실패: ' + error.message);
        } else {
            setEditingSourceId(null);
            loadFeedSources();
        }
    };

    // Update curated link
    const updateCuratedLink = async () => {
        if (!editingCuratedId) return;

        // Logic to determine nickname/profile based on selection
        let finalNickname = editCuratedNickname;
        let finalProfileImage = editCuratedProfileImage;

        if (editCuratedEditorId) {
            const editor = curatedEditors.find(e => e.id === editCuratedEditorId);
            if (editor) {
                finalNickname = editor.nickname;
                finalProfileImage = editor.profile_image;
            }
        }

        const { error } = await supabase.from('curated_links').update({
            title: editCuratedTitle.trim(),
            thumbnail: editCuratedThumbnail.trim() || null,
            boost_score: parseInt(editCuratedBoost) || 0,
            show_in_feed: editShowInFeed,
            show_in_featured: editShowInFeatured,
            show_in_top10: editShowInTop10,
            editor_id: editCuratedEditorId || null,
            nickname: finalNickname || null,
            profile_image: finalProfileImage || null,
        } as any).eq('id', editingCuratedId);

        if (error) {
            alert('수정 실패: ' + error.message);
        } else {
            setEditingCuratedId(null);
            loadCuratedLinks();
        }
    };

    // Update boost score for user link
    const updateBoostScore = async (linkId: string, boostScore: number, source: 'user' | 'curated') => {
        const table = source === 'user' ? 'links' : 'curated_links';
        const { error } = await supabase
            .from(table)
            .update({ boost_score: boostScore })
            .eq('id', linkId);

        if (error) {
            alert('업데이트 실패: ' + error.message);
        } else {
            loadTop10Full();
        }
    };

    const loadLinks = async () => {
        setIsLoading(true);
        try {
            // Load user links
            let query = supabase
                .from('links')
                .select('id, url, og_title, custom_title, og_image, is_featured, is_public, created_at, user_id, category_id, boost_score')
                .order('created_at', { ascending: false });

            // Apply filter
            if (filter === 'featured') {
                query = query.eq('is_featured', true);
            } else if (filter === 'hidden') {
                query = query.eq('is_public', false);
            }

            const { data, error } = await query.limit(100);

            // Load curated links
            const { data: curatedData } = await supabase
                .from('curated_links')
                .select('id, url, title, thumbnail, nickname, profile_image, category, boost_score, show_in_featured, created_at')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error loading links:', error);
                return;
            }

            if (!data) {
                setLinks([]);
                return;
            }

            // Get all user IDs and category IDs
            const userIds = Array.from(new Set(data.map(l => l.user_id).filter(Boolean)));
            const categoryIds = Array.from(new Set(data.map(l => l.category_id).filter(Boolean)));
            const linkIds = data.map(l => l.id);

            // Fetch nicknames
            const nicknameMap: Record<string, string> = {};
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, nickname')
                    .in('id', userIds);
                profiles?.forEach(p => { nicknameMap[p.id] = p.nickname; });
            }

            // Fetch category names
            const categoryMap: Record<string, string> = {};
            if (categoryIds.length > 0) {
                const { data: categories } = await supabase
                    .from('categories')
                    .select('id, name')
                    .in('id', categoryIds);
                categories?.forEach(c => { categoryMap[c.id] = c.name; });
            }

            // Fetch like counts
            const likeCountMap: Record<string, number> = {};
            if (linkIds.length > 0) {
                const { data: likes } = await supabase
                    .from('favorite_history')
                    .select('link_id')
                    .in('link_id', linkIds);
                likes?.forEach(l => {
                    likeCountMap[l.link_id] = (likeCountMap[l.link_id] || 0) + 1;
                });
            }

            // Combine user links
            const enrichedLinks: AdminLink[] = data.map(link => ({
                ...link,
                author_nickname: nicknameMap[link.user_id] || 'Unknown',
                category_name: categoryMap[link.category_id] || '미분류',
                likes_count: likeCountMap[link.id] || 0,
            }));

            // Add curated links
            const enrichedCuratedLinks: AdminLink[] = (curatedData || []).map(link => ({
                id: link.id,
                url: link.url,
                og_title: link.title,
                og_image: link.thumbnail,
                is_featured: link.show_in_featured,
                is_public: true,
                created_at: link.created_at,
                user_id: null,
                category_id: null,
                boost_score: link.boost_score || 0,
                author_nickname: `${link.nickname} (자동수집)`,
                category_name: link.category || '일반',
                likes_count: 0,
            }));

            // Merge and sort by date
            const allLinks = [...enrichedLinks, ...enrichedCuratedLinks]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setLinks(allLinks);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFeatured = async (linkId: string, currentStatus: boolean) => {
        console.log('toggleFeatured called:', linkId, currentStatus);
        try {
            const { error } = await supabase
                .from('links')
                .update({ is_featured: !currentStatus })
                .eq('id', linkId);

            if (error) {
                console.error('toggleFeatured error:', error);
                Alert.alert('오류', '업데이트 실패: ' + error.message);
            } else {
                console.log('toggleFeatured success');
                setLinks(prev => prev.map(link =>
                    link.id === linkId ? { ...link, is_featured: !currentStatus } : link
                ));
            }
        } catch (e) {
            console.error('toggleFeatured exception:', e);
            Alert.alert('오류', '예외 발생');
        }
    };

    const togglePublic = async (linkId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('links')
            .update({ is_public: !currentStatus })
            .eq('id', linkId);

        if (error) {
            Alert.alert('오류', '업데이트 실패: ' + error.message);
        } else {
            setLinks(prev => prev.map(link =>
                link.id === linkId ? { ...link, is_public: !currentStatus } : link
            ));
        }
    };

    const deleteLink = async (linkId: string) => {
        // Use window.confirm for web compatibility
        const confirmed = typeof window !== 'undefined'
            ? window.confirm('이 링크를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
            : true;

        if (!confirmed) return;

        // Find the link to determine which table it's from
        const link = links.find(l => l.id === linkId);
        if (!link) {
            alert('링크를 찾을 수 없습니다.');
            return;
        }

        // Determine table based on user_id (null means curated_links)
        const tableName = link.user_id === null ? 'curated_links' : 'links';

        console.log('Deleting from table:', tableName, 'id:', linkId);

        // Perform delete without .select() to avoid 400 error
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', linkId);

        console.log('Delete result - error:', error);

        if (error) {
            console.error('Delete error details:', JSON.stringify(error));
            alert('삭제 실패: ' + error.message);
        } else {
            // Success - remove from local state
            setLinks(prev => prev.filter(link => link.id !== linkId));
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    };

    // Login screen
    if (!isAuthenticated) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
                <View style={styles.loginContainer}>
                    <View style={styles.loginHeader}>
                        <Ionicons name="shield-checkmark" size={48} color={colors.accent} />
                        <Text style={[styles.loginTitle, { color: colors.text }]}>관리자 로그인</Text>
                        <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
                            관리자 비밀번호를 입력하세요
                        </Text>
                    </View>

                    <View style={styles.loginForm}>
                        <TextInput
                            style={[styles.passwordInput, {
                                backgroundColor: colors.card,
                                borderColor: passwordError ? '#EF4444' : colors.border,
                                color: colors.text
                            }]}
                            placeholder="비밀번호"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            onSubmitEditing={handleLogin}
                        />
                        {passwordError && (
                            <Text style={styles.errorText}>{passwordError}</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.loginButton, { backgroundColor: colors.accent }]}
                            onPress={handleLogin}
                        >
                            <Text style={styles.loginButtonText}>로그인</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
                            ← 돌아가기
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Admin Home
    const renderHome = () => (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>관리 메뉴</Text>

            {/* Links Management Card */}
            <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setCurrentSection('links')}
            >
                <View style={[styles.menuIcon, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="link" size={24} color="#FFF" />
                </View>
                <View style={styles.menuInfo}>
                    <Text style={[styles.menuTitle, { color: colors.text }]}>추천 링크 관리</Text>
                    <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>
                        공개 링크 확인, 추천/비공개/삭제
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Users Management Card */}
            <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setCurrentSection('users')}
            >
                <View style={[styles.menuIcon, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="people" size={24} color="#FFF" />
                </View>
                <View style={styles.menuInfo}>
                    <Text style={[styles.menuTitle, { color: colors.text }]}>유저 관리</Text>
                    <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>
                        총 {userCount}명의 가입자
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Top 10 Management Card */}
            <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setCurrentSection('top10')}
            >
                <View style={[styles.menuIcon, { backgroundColor: '#F59E0B' }]}>
                    <Ionicons name="trophy" size={24} color="#FFF" />
                </View>
                <View style={styles.menuInfo}>
                    <Text style={[styles.menuTitle, { color: colors.text }]}>Top 10 관리</Text>
                    <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>
                        실시간 인기 링크 확인
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );

    // Links Management Section
    const renderLinks = () => (
        <>
            {/* Filter Tabs */}
            <View style={[styles.filterTabs, { borderBottomColor: colors.border }]}>
                {(['all', 'hidden'] as LinkFilter[]).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[
                            styles.filterTab,
                            filter === f && { borderBottomColor: colors.accent, borderBottomWidth: 2 }
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterTabText, { color: filter === f ? colors.accent : colors.textSecondary }]}>
                            {f === 'all' ? '전체' : '비공개'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.linksList} showsVerticalScrollIndicator={false}>
                {isLoading ? (
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>로딩 중...</Text>
                ) : links.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>링크가 없습니다</Text>
                ) : (
                    links.map(link => (
                        <View key={link.id} style={[styles.linkItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.linkContent}>
                                {link.og_image && (
                                    <Image source={{ uri: link.og_image }} style={styles.linkThumbnail} />
                                )}
                                <View style={styles.linkInfo}>
                                    <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={1}>
                                        {link.og_title}
                                    </Text>
                                    {link.custom_title && (
                                        <Text style={[styles.customTitle, { color: colors.accent }]} numberOfLines={1}>
                                            ✏️ {link.custom_title}
                                        </Text>
                                    )}
                                    <View style={styles.linkMeta}>
                                        <Text style={[styles.linkMetaText, { color: colors.textSecondary }]}>
                                            @{link.author_nickname}
                                        </Text>
                                        <Text style={[styles.linkMetaText, { color: colors.textSecondary }]}>
                                            {formatDate(link.created_at)}
                                        </Text>
                                        <Text style={[styles.linkMetaText, { color: colors.textSecondary }]}>
                                            ❤️ {link.likes_count}
                                        </Text>
                                    </View>
                                    <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
                                        <Text style={[styles.categoryText, { color: colors.text }]}>
                                            {link.category_name}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.linkActions}>
                                <View style={styles.boostInputSmall}>
                                    <TextInput
                                        style={[styles.boostFieldSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        value={String(link.boost_score || 0)}
                                        keyboardType="number-pad"
                                        placeholder="🚀"
                                        onChangeText={(val) => {
                                            const newScore = parseInt(val) || 0;
                                            setLinks(prev => prev.map(l =>
                                                l.id === link.id ? { ...l, boost_score: newScore } : l
                                            ));
                                        }}
                                        onBlur={() => {
                                            supabase.from('links').update({ boost_score: link.boost_score || 0 }).eq('id', link.id)
                                                .then(({ error }) => {
                                                    if (error) alert('저장 실패: ' + error.message);
                                                });
                                        }}
                                    />
                                    <TouchableOpacity
                                        style={[styles.saveBtnSmall, { backgroundColor: colors.accent }]}
                                        onPress={() => {
                                            supabase.from('links').update({ boost_score: link.boost_score || 0 }).eq('id', link.id)
                                                .then(({ error }) => {
                                                    if (error) alert('저장 실패: ' + error.message);
                                                    else alert('저장됨');
                                                });
                                        }}
                                    >
                                        <Text style={styles.saveBtnSmallText}>저장</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: link.is_featured ? colors.accent : colors.border }]}
                                    onPress={() => toggleFeatured(link.id, link.is_featured)}
                                >
                                    <Ionicons name={link.is_featured ? 'star' : 'star-outline'} size={16} color={link.is_featured ? '#000' : colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: link.is_public ? colors.border : '#EF4444' }]}
                                    onPress={() => togglePublic(link.id, link.is_public)}
                                >
                                    <Ionicons name={link.is_public ? 'eye' : 'eye-off'} size={16} color={link.is_public ? colors.text : '#FFF'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                                    onPress={() => deleteLink(link.id)}
                                >
                                    <Ionicons name="trash" size={16} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Stats */}
            <View style={[styles.statsBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                    총 {links.length}개 | 추천: {links.filter(l => l.is_featured).length}개 | 비공개: {links.filter(l => !l.is_public).length}개
                </Text>
            </View>
        </>
    );

    // Users Management Stub
    const renderUsers = () => (
        <View style={styles.stubContainer}>
            <Ionicons name="people" size={64} color={colors.textSecondary} />
            <Text style={[styles.stubTitle, { color: colors.text }]}>유저 관리</Text>
            <Text style={[styles.stubDesc, { color: colors.textSecondary }]}>
                총 {userCount}명의 가입자가 있습니다
            </Text>
            <View style={[styles.stubBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.stubBadgeText}>추후 구현 예정</Text>
            </View>
        </View>
    );

    // Top 10 Management - Full implementation
    const renderTop10 = () => (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>실시간 Top 10 가중치 관리</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary, marginBottom: 16 }]}>
                점수 = 7일간 좋아요 + Boost 가중치
            </Text>

            {isLoading ? (
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>로딩 중...</Text>
            ) : top10FullData.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>데이터가 없습니다</Text>
            ) : (
                top10FullData.map((item, idx) => (
                    <View key={item.id} style={[styles.top10Card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.top10Rank}>
                            <Text style={[styles.top10RankText, { color: colors.accent }]}>{idx + 1}</Text>
                        </View>
                        <View style={styles.top10Info}>
                            <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={1}>
                                {item.og_title}
                            </Text>
                            <View style={styles.scoreRow}>
                                <Text style={[styles.scoreText, { color: colors.textSecondary }]}>
                                    ❤️ {item.likes_count || 0} + 🚀 {item.boost_score || 0} = {item.totalScore}점
                                </Text>
                                <View style={[styles.sourceBadge, { backgroundColor: item.source === 'curated' ? '#8B5CF6' : colors.border }]}>
                                    <Text style={[styles.sourceText, { color: item.source === 'curated' ? '#FFF' : colors.text }]}>
                                        {item.source === 'curated' ? '큐레이션' : '유저'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.boostInput}>
                            <TextInput
                                style={[styles.boostField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                value={String(item.boost_score || 0)}
                                keyboardType="number-pad"
                                onChangeText={(val) => {
                                    const newScore = parseInt(val) || 0;
                                    setTop10FullData(prev => prev.map(p =>
                                        p.id === item.id ? { ...p, boost_score: newScore, totalScore: (p.likes_count || 0) + newScore } : p
                                    ));
                                }}
                            />
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                                onPress={() => updateBoostScore(item.id, item.boost_score || 0, item.source)}
                            >
                                <Text style={styles.saveBtnText}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );

    // Curated Links Management
    const renderCurated = () => (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Editor Management Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>에디터 관리</Text>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                        style={[styles.formInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="닉네임"
                        placeholderTextColor={colors.textSecondary}
                        value={newEditorNickname}
                        onChangeText={setNewEditorNickname}
                    />
                    <TextInput
                        style={[styles.formInput, { flex: 2, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="프로필 이미지 URL"
                        placeholderTextColor={colors.textSecondary}
                        value={newEditorProfileImage}
                        onChangeText={setNewEditorProfileImage}
                    />
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                        onPress={addEditor}
                    >
                        <Text style={styles.saveBtnText}>추가</Text>
                    </TouchableOpacity>
                </View>

                {/* Editors List */}
                {curatedEditors.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                        {curatedEditors.map(editor => (
                            <View key={editor.id} style={[styles.editorCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                {editor.profile_image ? (
                                    <Image source={{ uri: editor.profile_image }} style={styles.editorAvatar} />
                                ) : (
                                    <View style={[styles.editorAvatar, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Ionicons name="person" size={20} color={colors.textSecondary} />
                                    </View>
                                )}
                                <View style={styles.editorInfo}>
                                    <Text style={[styles.editorName, { color: colors.text }]}>{editor.nickname}</Text>
                                    {editor.description && (
                                        <Text style={[styles.editorDesc, { color: colors.textSecondary }]}>{editor.description}</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => deleteEditor(editor.id)}>
                                    <Ionicons name="trash" size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>큐레이션 링크 등록</Text>

            {/* Add Form */}
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                        style={[styles.formInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="URL 입력 후 자동 불러오기"
                        placeholderTextColor={colors.textSecondary}
                        value={newCuratedUrl}
                        onChangeText={setNewCuratedUrl}
                        onBlur={() => fetchURLMetadata(newCuratedUrl)}
                    />
                    {isFetchingOG && (
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>불러오는 중...</Text>
                    )}
                </View>
                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="제목 (자동 입력됨, 수정 가능)"
                    placeholderTextColor={colors.textSecondary}
                    value={newCuratedTitle}
                    onChangeText={setNewCuratedTitle}
                />
                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="썸네일 URL (자동 입력됨, 수정 가능)"
                    placeholderTextColor={colors.textSecondary}
                    value={newCuratedThumbnail}
                    onChangeText={setNewCuratedThumbnail}
                />
                {/* Thumbnail Preview */}
                {newCuratedThumbnail.trim() !== '' && (
                    <View style={{ marginBottom: 12 }}>
                        <Image
                            source={{ uri: newCuratedThumbnail }}
                            style={{ width: '100%', height: 150, borderRadius: 8, backgroundColor: colors.border }}
                            resizeMode="cover"
                        />
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                            썸네일 미리보기
                        </Text>
                    </View>
                )}

                {/* Editor Selection */}
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 8, marginBottom: 8 }]}>에디터 선택</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                        style={[
                            styles.editorChip,
                            { backgroundColor: selectedEditorId === null ? colors.accent : colors.border }
                        ]}
                        onPress={() => setSelectedEditorId(null)}
                    >
                        <Text style={{ color: selectedEditorId === null ? '#000' : colors.text, fontWeight: '600' }}>
                            직접 입력
                        </Text>
                    </TouchableOpacity>
                    {curatedEditors.map(editor => (
                        <TouchableOpacity
                            key={editor.id}
                            style={[
                                styles.editorChip,
                                { backgroundColor: selectedEditorId === editor.id ? colors.accent : colors.border }
                            ]}
                            onPress={() => setSelectedEditorId(editor.id)}
                        >
                            {editor.profile_image && (
                                <Image source={{ uri: editor.profile_image }} style={styles.editorChipImage} />
                            )}
                            <Text style={{ color: selectedEditorId === editor.id ? '#000' : colors.text, fontWeight: '600' }}>
                                {editor.nickname}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Manual input only if no editor selected */}
                {selectedEditorId === null && (
                    <>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="유저 닉네임 (필수)"
                            placeholderTextColor={colors.textSecondary}
                            value={newCuratedNickname}
                            onChangeText={setNewCuratedNickname}
                        />
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="유저 프로필 이미지 URL (필수)"
                            placeholderTextColor={colors.textSecondary}
                            value={newCuratedProfileImage}
                            onChangeText={setNewCuratedProfileImage}
                        />
                    </>
                )}
                <View style={styles.formRow}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Boost 가중치:</Text>
                    <TextInput
                        style={[styles.boostField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        value={newCuratedBoost}
                        keyboardType="number-pad"
                        onChangeText={setNewCuratedBoost}
                    />
                </View>

                {/* Toggles */}
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, showInFeed && { backgroundColor: colors.accent }]}
                        onPress={() => setShowInFeed(!showInFeed)}
                    >
                        <Text style={[styles.toggleText, { color: showInFeed ? '#000' : colors.text }]}>피드</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, showInFeatured && { backgroundColor: colors.accent }]}
                        onPress={() => setShowInFeatured(!showInFeatured)}
                    >
                        <Text style={[styles.toggleText, { color: showInFeatured ? '#000' : colors.text }]}>추천</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, showInTop10 && { backgroundColor: colors.accent }]}
                        onPress={() => setShowInTop10(!showInTop10)}
                    >
                        <Text style={[styles.toggleText, { color: showInTop10 ? '#000' : colors.text }]}>Top 10</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.accent }]}
                    onPress={addCuratedLink}
                >
                    <Text style={styles.addButtonText}>추가</Text>
                </TouchableOpacity>
            </View>

            {/* Curated Links List */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>등록된 큐레이션 링크</Text>
            {curatedLinks.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 링크가 없습니다</Text>
            ) : (
                curatedLinks.map(link => (
                    <View key={link.id} style={[styles.curatedItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.curatedInfo}>
                            <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={1}>{link.title}</Text>
                            <Text style={[styles.linkUrl, { color: colors.textSecondary }]} numberOfLines={1}>{link.url}</Text>
                            <Text style={{ color: colors.accent, fontSize: 12, marginTop: 2 }}>
                                에디터: {link.nickname || '(미지정)'}
                            </Text>
                            <View style={styles.curatedBadges}>
                                {link.show_in_feed && <View style={[styles.miniBadge, { backgroundColor: '#3B82F6' }]}><Text style={styles.miniBadgeText}>피드</Text></View>}
                                {link.show_in_featured && <View style={[styles.miniBadge, { backgroundColor: '#10B981' }]}><Text style={styles.miniBadgeText}>추천</Text></View>}
                                {link.show_in_top10 && <View style={[styles.miniBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.miniBadgeText}>Top10</Text></View>}
                                <Text style={[styles.boostBadge, { color: colors.textSecondary }]}>🚀 {link.boost_score}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                                onPress={() => {
                                    setEditingCuratedId(link.id);
                                    setEditCuratedTitle(link.title);
                                    setEditCuratedThumbnail(link.thumbnail || '');
                                    setEditCuratedBoost(String(link.boost_score || 0));
                                    setEditShowInFeed(link.show_in_feed);
                                    setEditShowInFeatured(link.show_in_featured);
                                    setEditShowInTop10(link.show_in_top10);
                                    setEditCuratedEditorId(link.editor_id || null);
                                    setEditCuratedNickname(link.nickname || '');
                                    setEditCuratedProfileImage(link.profile_image || '');
                                }}
                            >
                                <Ionicons name="pencil" size={16} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                                onPress={() => deleteCuratedLink(link.id)}
                            >
                                <Ionicons name="trash" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
            <View style={{ height: 40 }} />

            {/* Edit Curated Link Modal */}
            <Modal
                visible={!!editingCuratedId}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditingCuratedId(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '90%' }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>큐레이션 링크 수정</Text>
                                <TouchableOpacity onPress={() => setEditingCuratedId(null)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="제목"
                                placeholderTextColor={colors.textSecondary}
                                value={editCuratedTitle}
                                onChangeText={setEditCuratedTitle}
                            />
                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="썸네일 URL"
                                placeholderTextColor={colors.textSecondary}
                                value={editCuratedThumbnail}
                                onChangeText={setEditCuratedThumbnail}
                            />

                            {/* Editor Selection */}
                            <Text style={[styles.formLabel, { color: colors.text, marginTop: 12, marginBottom: 8 }]}>에디터 변경</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                <TouchableOpacity
                                    style={[
                                        styles.editorChip,
                                        { backgroundColor: editCuratedEditorId === null ? colors.accent : colors.border }
                                    ]}
                                    onPress={() => setEditCuratedEditorId(null)}
                                >
                                    <Text style={{ color: editCuratedEditorId === null ? '#000' : colors.text, fontWeight: '600' }}>
                                        직접 입력
                                    </Text>
                                </TouchableOpacity>
                                {curatedEditors.map(editor => (
                                    <TouchableOpacity
                                        key={editor.id}
                                        style={[
                                            styles.editorChip,
                                            { backgroundColor: editCuratedEditorId === editor.id ? colors.accent : colors.border }
                                        ]}
                                        onPress={() => setEditCuratedEditorId(editor.id)}
                                    >
                                        {editor.profile_image && (
                                            <Image source={{ uri: editor.profile_image }} style={styles.editorChipImage} />
                                        )}
                                        <Text style={{ color: editCuratedEditorId === editor.id ? '#000' : colors.text, fontWeight: '600' }}>
                                            {editor.nickname}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Manual input only if no editor selected */}
                            {editCuratedEditorId === null && (
                                <>
                                    <TextInput
                                        style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="유저 닉네임 (필수)"
                                        placeholderTextColor={colors.textSecondary}
                                        value={editCuratedNickname}
                                        onChangeText={setEditCuratedNickname}
                                    />
                                    <TextInput
                                        style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="유저 프로필 이미지 URL (필수)"
                                        placeholderTextColor={colors.textSecondary}
                                        value={editCuratedProfileImage}
                                        onChangeText={setEditCuratedProfileImage}
                                    />
                                </>
                            )}

                            <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Boost 가중치:</Text>
                            <TextInput
                                style={[styles.boostField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, width: '100%', marginBottom: 16 }]}
                                value={editCuratedBoost}
                                keyboardType="number-pad"
                                onChangeText={setEditCuratedBoost}
                            />

                            <View style={styles.toggleRow}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editShowInFeed && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditShowInFeed(!editShowInFeed)}
                                >
                                    <Text style={[styles.toggleText, { color: editShowInFeed ? '#000' : colors.text }]}>피드</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editShowInFeatured && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditShowInFeatured(!editShowInFeatured)}
                                >
                                    <Text style={[styles.toggleText, { color: editShowInFeatured ? '#000' : colors.text }]}>추천</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editShowInTop10 && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditShowInTop10(!editShowInTop10)}
                                >
                                    <Text style={[styles.toggleText, { color: editShowInTop10 ? '#000' : colors.text }]}>Top 10</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: colors.border, flex: 1 }]}
                                    onPress={() => setEditingCuratedId(null)}
                                >
                                    <Text style={[styles.addButtonText, { color: colors.text }]}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: colors.accent, flex: 1 }]}
                                    onPress={updateCuratedLink}
                                >
                                    <Text style={styles.addButtonText}>수정 완료</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );

    // Render Avatars Management Section
    const renderAvatars = () => (
        <ScrollView style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>기본 프로필 아이콘 관리</Text>

            {/* Add New Avatar */}
            <View style={[styles.addForm, { backgroundColor: colors.card }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>새 아이콘 추가</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="이미지 URL"
                    placeholderTextColor={colors.textSecondary}
                    value={newAvatarUrl}
                    onChangeText={setNewAvatarUrl}
                />
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.accent, marginTop: 12 }]}
                    onPress={addDefaultAvatar}
                >
                    <Text style={styles.addButtonText}>추가</Text>
                </TouchableOpacity>
            </View>

            {/* Avatar List */}
            <Text style={[styles.formLabel, { color: colors.text, marginTop: 20 }]}>
                등록된 아이콘 ({defaultAvatars.length}개)
            </Text>
            <View style={styles.avatarGrid}>
                {defaultAvatars.map((avatar) => (
                    <View key={avatar.id} style={[styles.avatarCard, { backgroundColor: colors.card }]}>
                        <Image
                            source={{ uri: avatar.url }}
                            style={styles.avatarPreview}
                        />
                        <TouchableOpacity
                            style={[styles.deleteAvatarBtn, { backgroundColor: '#ff4444' }]}
                            onPress={() => deleteDefaultAvatar(avatar.id)}
                        >
                            <Ionicons name="trash" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </ScrollView>
    );

    // Render Feed Sources Management Section
    const renderFeedSources = () => (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>자동 피드 소스 관리</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary, marginBottom: 16 }]}>
                RSS, 뉴스레터, API 등에서 자동으로 컨텐츠를 수집합니다
            </Text>

            {/* Add Form */}
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 12 }]}>새 피드 소스 추가</Text>

                {/* Source Type */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, newSourceType === 'rss' && { backgroundColor: colors.accent }]}
                        onPress={() => setNewSourceType('rss')}
                    >
                        <Text style={[styles.toggleText, { color: newSourceType === 'rss' ? '#000' : colors.text }]}>RSS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, newSourceType === 'scraper' && { backgroundColor: colors.accent }]}
                        onPress={() => setNewSourceType('scraper')}
                    >
                        <Text style={[styles.toggleText, { color: newSourceType === 'scraper' ? '#000' : colors.text }]}>스크래퍼</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, newSourceType === 'api' && { backgroundColor: colors.accent }]}
                        onPress={() => setNewSourceType('api')}
                    >
                        <Text style={[styles.toggleText, { color: newSourceType === 'api' ? '#000' : colors.text }]}>API</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, newSourceType === 'newsletter' && { backgroundColor: colors.accent }]}
                        onPress={() => setNewSourceType('newsletter')}
                    >
                        <Text style={[styles.toggleText, { color: newSourceType === 'newsletter' ? '#000' : colors.text }]}>뉴스레터</Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="소스 이름 (예: TechCrunch, GeekNews)"
                    placeholderTextColor={colors.textSecondary}
                    value={newSourceName}
                    onChangeText={setNewSourceName}
                />
                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder={newSourceType === 'rss' ? 'RSS URL' : newSourceType === 'newsletter' ? '이메일 주소' : 'API 엔드포인트'}
                    placeholderTextColor={colors.textSecondary}
                    value={newSourceUrl}
                    onChangeText={setNewSourceUrl}
                />

                {/* Editor Selection */}
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 8, marginBottom: 8 }]}>에디터 선택</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                        style={[
                            styles.editorChip,
                            { backgroundColor: selectedSourceEditorId === null ? colors.accent : colors.border }
                        ]}
                        onPress={() => setSelectedSourceEditorId(null)}
                    >
                        <Text style={{ color: selectedSourceEditorId === null ? '#000' : colors.text, fontWeight: '600' }}>
                            직접 입력
                        </Text>
                    </TouchableOpacity>
                    {curatedEditors.map(editor => (
                        <TouchableOpacity
                            key={editor.id}
                            style={[
                                styles.editorChip,
                                { backgroundColor: selectedSourceEditorId === editor.id ? colors.accent : colors.border }
                            ]}
                            onPress={() => setSelectedSourceEditorId(editor.id)}
                        >
                            {editor.profile_image && (
                                <Image source={{ uri: editor.profile_image }} style={styles.editorChipImage} />
                            )}
                            <Text style={{ color: selectedSourceEditorId === editor.id ? '#000' : colors.text, fontWeight: '600' }}>
                                {editor.nickname}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {selectedSourceEditorId === null && (
                    <>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="에디터 닉네임 (필수)"
                            placeholderTextColor={colors.textSecondary}
                            value={newSourceEditorNickname}
                            onChangeText={setNewSourceEditorNickname}
                        />
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="에디터 프로필 이미지 URL (선택)"
                            placeholderTextColor={colors.textSecondary}
                            value={newSourceEditorImage}
                            onChangeText={setNewSourceEditorImage}
                        />
                    </>
                )}

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: colors.text }]}>카테고리</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={newSourceCategory}
                            onChangeText={setNewSourceCategory}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: colors.text }]}>Boost 점수</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={newSourceBoost}
                            keyboardType="number-pad"
                            onChangeText={setNewSourceBoost}
                        />
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: colors.text }]}>수집 주기 (시간)</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={newSourceInterval}
                            keyboardType="number-pad"
                            onChangeText={setNewSourceInterval}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: colors.text }]}>최대 아이템 수</Text>
                        <TextInput
                            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={newSourceMaxItems}
                            keyboardType="number-pad"
                            onChangeText={setNewSourceMaxItems}
                        />
                    </View>
                </View>

                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, newSourceShowInFeed && { backgroundColor: colors.accent }]}
                        onPress={() => setNewSourceShowInFeed(!newSourceShowInFeed)}
                    >
                        <Text style={[styles.toggleText, { color: newSourceShowInFeed ? '#000' : colors.text }]}>피드 표시</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, newSourceShowInFeatured && { backgroundColor: colors.accent }]}
                        onPress={() => setNewSourceShowInFeatured(!newSourceShowInFeatured)}
                    >
                        <Text style={[styles.toggleText, { color: newSourceShowInFeatured ? '#000' : colors.text }]}>추천 표시</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.accent }]}
                    onPress={addFeedSource}
                >
                    <Text style={styles.addButtonText}>피드 소스 추가</Text>
                </TouchableOpacity>
            </View>

            {/* Feed Sources List */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>등록된 피드 소스</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8 }]}
                    onPress={testFeedCollection}
                    disabled={isLoading}
                >
                    <Text style={styles.addButtonText}>{isLoading ? '수집 중...' : '🔄 지금 수집'}</Text>
                </TouchableOpacity>
            </View>
            {feedSources.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 피드 소스가 없습니다</Text>
            ) : (
                feedSources.map(source => (
                    <View key={source.id} style={[styles.curatedItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {/* Header with title and ALL action buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.linkTitle, { color: colors.text }]}>{source.name}</Text>
                                <View style={[styles.miniBadge, { backgroundColor: source.source_type === 'rss' ? '#3B82F6' : source.source_type === 'scraper' ? '#8B5CF6' : '#10B981' }]}>
                                    <Text style={styles.miniBadgeText}>{source.source_type.toUpperCase()}</Text>
                                </View>
                                {!source.is_active && (
                                    <View style={[styles.miniBadge, { backgroundColor: '#EF4444' }]}>
                                        <Text style={styles.miniBadgeText}>비활성</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#10B981', width: 32, height: 32 }]}
                                    onPress={() => collectSingleFeedSource(source.id, source.name)}
                                >
                                    <Ionicons name="refresh" size={14} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.accent, width: 32, height: 32 }]}
                                    onPress={() => {
                                        setEditingSourceId(source.id);
                                        setEditSourceName(source.name);
                                        setEditSourceType(source.source_type);
                                        setEditSourceUrl(source.url);
                                        setEditSourceEditorNickname(source.editor_nickname);
                                        setEditSourceEditorImage(source.editor_profile_image || '');
                                        setEditSourceCategory(source.category);
                                        setEditSourceBoost(String(source.boost_score || 0));
                                        setEditSourceInterval(String(source.collection_interval_hours));
                                        setEditSourceMaxItems(String(source.max_items_per_collection));
                                        setEditSourceShowInFeed(source.show_in_feed);
                                        setEditSourceShowInFeatured(source.show_in_featured);
                                        setEditSelectedSourceEditorId(null);
                                    }}
                                >
                                    <Ionicons name="pencil" size={14} color="#000" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: source.is_active ? '#3B82F6' : colors.border, width: 32, height: 32 }]}
                                    onPress={() => toggleFeedSourceActive(source.id, source.is_active)}
                                >
                                    <Ionicons name={source.is_active ? 'pause' : 'play'} size={14} color={source.is_active ? '#FFF' : colors.text} />
                                </TouchableOpacity>
                                {(source.actual_items_count || 0) > 0 && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#F59E0B', width: 32, height: 32 }]}
                                        onPress={() => deleteFeedSourceLinks(source.name)}
                                    >
                                        <Ionicons name="trash-bin" size={14} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#EF4444', width: 32, height: 32 }]}
                                    onPress={() => deleteFeedSource(source.id)}
                                >
                                    <Ionicons name="trash" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.curatedInfo}>
                            <Text style={[styles.linkUrl, { color: colors.textSecondary }]} numberOfLines={1}>{source.url}</Text>
                            <Text style={{ color: colors.accent, fontSize: 12, marginTop: 2 }}>
                                에디터: {source.editor_nickname} | {source.collection_interval_hours}시간마다 {source.max_items_per_collection}개
                            </Text>
                            <View style={styles.curatedBadges}>
                                {source.show_in_feed && <View style={[styles.miniBadge, { backgroundColor: '#3B82F6' }]}><Text style={styles.miniBadgeText}>피드</Text></View>}
                                {source.show_in_featured && <View style={[styles.miniBadge, { backgroundColor: '#10B981' }]}><Text style={styles.miniBadgeText}>추천</Text></View>}
                                <Text style={[styles.boostBadge, { color: colors.textSecondary }]}>🚀 {source.boost_score}</Text>
                                {(source.actual_items_count !== undefined && source.actual_items_count > 0) && (
                                    <Text style={[styles.boostBadge, { color: colors.textSecondary }]}>📊 {source.actual_items_count}개</Text>
                                )}
                            </View>
                            {source.last_collected_at && (
                                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                                    마지막 수집: {new Date(source.last_collected_at).toLocaleString('ko-KR')}
                                </Text>
                            )}
                            {(source.actual_items_count || 0) > 0 && (
                                <TouchableOpacity
                                    onPress={() => toggleSourceExpanded(source.id, source.editor_nickname)}
                                    style={{ marginTop: 8 }}
                                >
                                    <Text style={{ color: colors.accent, fontSize: 12 }}>
                                        {expandedSourceId === source.id ? '▼' : '▶'} 수집된 링크 보기 ({source.actual_items_count}개)
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Expanded links list */}
                            {expandedSourceId === source.id && sourceLinks[source.id] && (
                                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                                    {sourceLinks[source.id].length === 0 ? (
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', padding: 8 }}>
                                            수집된 링크가 없습니다
                                        </Text>
                                    ) : (
                                        sourceLinks[source.id].map((link) => (
                                            <View key={link.id} style={{
                                                backgroundColor: colors.background,
                                                borderRadius: 8,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                padding: 12,
                                                marginBottom: 8,
                                                flexDirection: 'row',
                                                alignItems: 'flex-start'
                                            }}>
                                                {link.og_image && (
                                                    <Image
                                                        source={{ uri: link.og_image }}
                                                        style={{ width: 60, height: 60, borderRadius: 6, marginRight: 12 }}
                                                    />
                                                )}
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500', marginBottom: 4 }} numberOfLines={2}>
                                                        {link.og_title}
                                                    </Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                                                            @{link.author_nickname}
                                                        </Text>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                                                            {formatDate(link.created_at)}
                                                        </Text>
                                                        <View style={{ backgroundColor: colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                            <Text style={{ color: colors.text, fontSize: 10 }}>
                                                                {link.category_name}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <TouchableOpacity
                                                    style={{ marginLeft: 8, backgroundColor: '#EF4444', borderRadius: 6, padding: 8 }}
                                                    onPress={() => deleteSourceLink(source.id, link.id)}
                                                >
                                                    <Ionicons name="trash" size={14} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                ))
            )}
            <View style={{ height: 40 }} />

            {/* Edit Feed Source Modal */}
            <Modal
                visible={!!editingSourceId}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditingSourceId(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '90%' }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>피드 소스 수정</Text>
                                <TouchableOpacity onPress={() => setEditingSourceId(null)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Source Type */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editSourceType === 'rss' && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditSourceType('rss')}
                                >
                                    <Text style={[styles.toggleText, { color: editSourceType === 'rss' ? '#000' : colors.text }]}>RSS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editSourceType === 'scraper' && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditSourceType('scraper')}
                                >
                                    <Text style={[styles.toggleText, { color: editSourceType === 'scraper' ? '#000' : colors.text }]}>스크래퍼</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editSourceType === 'api' && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditSourceType('api')}
                                >
                                    <Text style={[styles.toggleText, { color: editSourceType === 'api' ? '#000' : colors.text }]}>API</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editSourceType === 'newsletter' && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditSourceType('newsletter')}
                                >
                                    <Text style={[styles.toggleText, { color: editSourceType === 'newsletter' ? '#000' : colors.text }]}>뉴스레터</Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="소스 이름"
                                placeholderTextColor={colors.textSecondary}
                                value={editSourceName}
                                onChangeText={setEditSourceName}
                            />
                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="URL"
                                placeholderTextColor={colors.textSecondary}
                                value={editSourceUrl}
                                onChangeText={setEditSourceUrl}
                            />

                            {/* Editor Selection */}
                            <Text style={[styles.formLabel, { color: colors.text, marginTop: 8, marginBottom: 8 }]}>에디터 선택</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                <TouchableOpacity
                                    style={[
                                        styles.editorChip,
                                        { backgroundColor: editSelectedSourceEditorId === null ? colors.accent : colors.border }
                                    ]}
                                    onPress={() => setEditSelectedSourceEditorId(null)}
                                >
                                    <Text style={{ color: editSelectedSourceEditorId === null ? '#000' : colors.text, fontWeight: '600' }}>
                                        직접 입력
                                    </Text>
                                </TouchableOpacity>
                                {curatedEditors.map(editor => (
                                    <TouchableOpacity
                                        key={editor.id}
                                        style={[
                                            styles.editorChip,
                                            { backgroundColor: editSelectedSourceEditorId === editor.id ? colors.accent : colors.border }
                                        ]}
                                        onPress={() => setEditSelectedSourceEditorId(editor.id)}
                                    >
                                        {editor.profile_image && (
                                            <Image source={{ uri: editor.profile_image }} style={styles.editorChipImage} />
                                        )}
                                        <Text style={{ color: editSelectedSourceEditorId === editor.id ? '#000' : colors.text, fontWeight: '600' }}>
                                            {editor.nickname}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {editSelectedSourceEditorId === null && (
                                <>
                                    <TextInput
                                        style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="에디터 닉네임"
                                        placeholderTextColor={colors.textSecondary}
                                        value={editSourceEditorNickname}
                                        onChangeText={setEditSourceEditorNickname}
                                    />
                                    <TextInput
                                        style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="에디터 프로필 이미지 URL"
                                        placeholderTextColor={colors.textSecondary}
                                        value={editSourceEditorImage}
                                        onChangeText={setEditSourceEditorImage}
                                    />
                                </>
                            )}

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.formLabel, { color: colors.text }]}>카테고리</Text>
                                    <TextInput
                                        style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        value={editSourceCategory}
                                        onChangeText={setEditSourceCategory}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.formLabel, { color: colors.text }]}>Boost</Text>
                                    <TextInput
                                        style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        value={editSourceBoost}
                                        keyboardType="number-pad"
                                        onChangeText={setEditSourceBoost}
                                    />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.formLabel, { color: colors.text }]}>주기(시간)</Text>
                                    <TextInput
                                        style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        value={editSourceInterval}
                                        keyboardType="number-pad"
                                        onChangeText={setEditSourceInterval}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.formLabel, { color: colors.text }]}>최대 수</Text>
                                    <TextInput
                                        style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        value={editSourceMaxItems}
                                        keyboardType="number-pad"
                                        onChangeText={setEditSourceMaxItems}
                                    />
                                </View>
                            </View>

                            <View style={styles.toggleRow}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editSourceShowInFeed && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditSourceShowInFeed(!editSourceShowInFeed)}
                                >
                                    <Text style={[styles.toggleText, { color: editSourceShowInFeed ? '#000' : colors.text }]}>피드 표시</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, editSourceShowInFeatured && { backgroundColor: colors.accent }]}
                                    onPress={() => setEditSourceShowInFeatured(!editSourceShowInFeatured)}
                                >
                                    <Text style={[styles.toggleText, { color: editSourceShowInFeatured ? '#000' : colors.text }]}>추천 표시</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: colors.border, flex: 1 }]}
                                    onPress={() => setEditingSourceId(null)}
                                >
                                    <Text style={[styles.addButtonText, { color: colors.text }]}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: colors.accent, flex: 1 }]}
                                    onPress={updateFeedSource}
                                >
                                    <Text style={styles.addButtonText}>수정 완료</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );

    const getSectionTitle = () => {
        switch (currentSection) {
            case 'home': return '관리자 대시보드';
            case 'links': return '링크 관리';
            case 'featured': return '추천 관리';
            case 'users': return '유저 관리';
            case 'top10': return 'Top 10 관리';
            case 'curated': return '큐레이션 관리';
            case 'feed_sources': return '피드 소스 관리';
        }
    };

    // Render Featured section - shows all featured links from both user links and curated links
    const renderFeatured = () => {
        const featuredUserLinks = links.filter((link: AdminLink) => link.is_featured);
        const featuredCuratedLinks = curatedLinks.filter(link => link.show_in_featured);

        // Apply filter
        const displayLinks = featuredFilter === 'all' 
            ? [...featuredUserLinks.map(l => ({ ...l, source: 'user' as const })), ...featuredCuratedLinks.map(l => ({ ...l, source: 'curated' as const }))]
            : featuredFilter === 'user'
            ? featuredUserLinks.map(l => ({ ...l, source: 'user' as const }))
            : featuredCuratedLinks.map(l => ({ ...l, source: 'curated' as const }));

        return (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Filter Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            { 
                                backgroundColor: featuredFilter === 'all' ? colors.accent : colors.card,
                                borderColor: featuredFilter === 'all' ? colors.accent : colors.border
                            }
                        ]}
                        onPress={() => setFeaturedFilter('all')}
                    >
                        <Text style={[
                            styles.filterButtonText,
                            { color: featuredFilter === 'all' ? '#FFF' : colors.text }
                        ]}>
                            전체 ({featuredUserLinks.length + featuredCuratedLinks.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            { 
                                backgroundColor: featuredFilter === 'user' ? colors.accent : colors.card,
                                borderColor: featuredFilter === 'user' ? colors.accent : colors.border
                            }
                        ]}
                        onPress={() => setFeaturedFilter('user')}
                    >
                        <Text style={[
                            styles.filterButtonText,
                            { color: featuredFilter === 'user' ? '#FFF' : colors.text }
                        ]}>
                            유저 등록 ({featuredUserLinks.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            { 
                                backgroundColor: featuredFilter === 'curated' ? colors.accent : colors.card,
                                borderColor: featuredFilter === 'curated' ? colors.accent : colors.border
                            }
                        ]}
                        onPress={() => setFeaturedFilter('curated')}
                    >
                        <Text style={[
                            styles.filterButtonText,
                            { color: featuredFilter === 'curated' ? '#FFF' : colors.text }
                        ]}>
                            큐레이션 ({featuredCuratedLinks.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Links List */}
                {displayLinks.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {featuredFilter === 'all' && '추천된 링크가 없습니다'}
                        {featuredFilter === 'user' && '추천된 유저 링크가 없습니다'}
                        {featuredFilter === 'curated' && '추천된 큐레이션 링크가 없습니다'}
                    </Text>
                ) : (
                    displayLinks.map((item: any) => (
                        <View 
                            key={`${item.source}-${item.id}`} 
                            style={[
                                styles.linkItem, 
                                { 
                                    backgroundColor: colors.card, 
                                    borderColor: colors.border,
                                    borderLeftWidth: 3,
                                    borderLeftColor: item.source === 'user' ? '#3B82F6' : '#10B981'
                                }
                            ]}
                        >
                            <View style={styles.linkInfo}>
                                {/* Source Badge */}
                                <View style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    marginBottom: 4 
                                }}>
                                    <View style={{
                                        backgroundColor: item.source === 'user' ? '#3B82F620' : '#10B98120',
                                        paddingHorizontal: 8,
                                        paddingVertical: 2,
                                        borderRadius: 4,
                                        marginRight: 8
                                    }}>
                                        <Text style={{ 
                                            color: item.source === 'user' ? '#3B82F6' : '#10B981',
                                            fontSize: 10,
                                            fontWeight: '600'
                                        }}>
                                            {item.source === 'user' ? '유저' : '큐레이션'}
                                        </Text>
                                    </View>
                                    {item.source === 'curated' && item.nickname && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                                            에디터: {item.nickname}
                                        </Text>
                                    )}
                                </View>
                                
                                {/* Title */}
                                <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={2}>
                                    {item.source === 'user' ? item.og_title : item.title}
                                </Text>
                                
                                {/* URL */}
                                <Text style={[styles.linkUrl, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
                                    {item.url}
                                </Text>
                            </View>

                            {/* Remove Button */}
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                                onPress={async () => {
                                    if (item.source === 'user') {
                                        await supabase.from('links').update({ is_featured: false }).eq('id', item.id);
                                        loadLinks();
                                    } else {
                                        await supabase.from('curated_links').update({ show_in_featured: false }).eq('id', item.id);
                                        loadCuratedLinks();
                                    }
                                }}
                            >
                                <Text style={{ color: '#FFF', fontSize: 12 }}>제거</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        );
    };

    // Admin Dashboard with Sidebar
    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>관리자 대시보드</Text>
                <TouchableOpacity onPress={loadLinks}>
                    <Ionicons name="refresh" size={24} color={colors.accent} />
                </TouchableOpacity>
            </View>

            {/* Main content with sidebar */}
            <View style={styles.mainLayout}>
                {/* Sidebar */}
                <View style={[styles.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.sidebarItem,
                            currentSection === 'links' && { backgroundColor: colors.accent + '20' }
                        ]}
                        onPress={() => setCurrentSection('links')}
                    >
                        <Ionicons name="link" size={20} color={currentSection === 'links' ? colors.accent : colors.text} />
                        <Text style={[styles.sidebarText, { color: currentSection === 'links' ? colors.accent : colors.text }]}>
                            링크 관리
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.sidebarItem,
                            currentSection === 'featured' && { backgroundColor: colors.accent + '20' }
                        ]}
                        onPress={() => setCurrentSection('featured')}
                    >
                        <Ionicons name="star" size={20} color={currentSection === 'featured' ? colors.accent : colors.text} />
                        <Text style={[styles.sidebarText, { color: currentSection === 'featured' ? colors.accent : colors.text }]}>
                            추천
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.sidebarItem,
                            currentSection === 'users' && { backgroundColor: colors.accent + '20' }
                        ]}
                        onPress={() => setCurrentSection('users')}
                    >
                        <Ionicons name="people" size={20} color={currentSection === 'users' ? colors.accent : colors.text} />
                        <Text style={[styles.sidebarText, { color: currentSection === 'users' ? colors.accent : colors.text }]}>
                            유저 관리
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.sidebarItem,
                            currentSection === 'top10' && { backgroundColor: colors.accent + '20' }
                        ]}
                        onPress={() => setCurrentSection('top10')}
                    >
                        <Ionicons name="trophy" size={20} color={currentSection === 'top10' ? colors.accent : colors.text} />
                        <Text style={[styles.sidebarText, { color: currentSection === 'top10' ? colors.accent : colors.text }]}>
                            Top 10
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.sidebarItem,
                            currentSection === 'curated' && { backgroundColor: colors.accent + '20' }
                        ]}
                        onPress={() => setCurrentSection('curated')}
                    >
                        <Ionicons name="add-circle" size={20} color={currentSection === 'curated' ? colors.accent : colors.text} />
                        <Text style={[styles.sidebarText, { color: currentSection === 'curated' ? colors.accent : colors.text }]}>
                            큐레이션
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.sidebarItem,
                            currentSection === 'avatars' && { backgroundColor: colors.accent + '20' }
                        ]}
                        onPress={() => setCurrentSection('avatars')}
                    >
                        <Ionicons name="person-circle" size={20} color={currentSection === 'avatars' ? colors.accent : colors.text} />
                        <Text style={[styles.sidebarText, { color: currentSection === 'avatars' ? colors.accent : colors.text }]}>
                            기본 아이콘
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.sidebarItem,
                            currentSection === 'feed_sources' && { backgroundColor: colors.accent + '20' }
                        ]}
                        onPress={() => setCurrentSection('feed_sources')}
                    >
                        <Ionicons name="cloud-download" size={20} color={currentSection === 'feed_sources' ? colors.accent : colors.text} />
                        <Text style={[styles.sidebarText, { color: currentSection === 'feed_sources' ? colors.accent : colors.text }]}>
                            피드 소스
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content Area */}
                <View style={styles.contentArea}>
                    {currentSection === 'links' && renderLinks()}
                    {currentSection === 'featured' && renderFeatured()}
                    {currentSection === 'users' && renderUsers()}
                    {currentSection === 'top10' && renderTop10()}
                    {currentSection === 'curated' && renderCurated()}
                    {currentSection === 'avatars' && renderAvatars()}
                    {currentSection === 'feed_sources' && renderFeedSources()}
                    {currentSection === 'home' && renderLinks()}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: 100,
        borderRightWidth: 1,
        paddingTop: 16,
    },
    sidebarItem: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        marginHorizontal: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    sidebarText: {
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center',
    },
    contentArea: {
        flex: 1,
    },
    loginContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loginHeader: {
        alignItems: 'center',
        marginBottom: 40,
    },
    loginTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
    },
    loginSubtitle: {
        fontSize: 14,
        marginTop: 8,
    },
    loginForm: {
        width: '100%',
        maxWidth: 300,
    },
    passwordInput: {
        width: '100%',
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 8,
    },
    loginButton: {
        width: '100%',
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    loginButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        marginTop: 24,
    },
    backButtonText: {
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    menuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    menuIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuInfo: {
        flex: 1,
        marginLeft: 16,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    menuDesc: {
        fontSize: 13,
        marginTop: 4,
    },
    filterTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    linksList: {
        flex: 1,
        padding: 16,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 40,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
    },
    linkItem: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    linkContent: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    linkThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    linkInfo: {
        flex: 1,
        marginLeft: 12,
    },
    linkTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    linkMeta: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
    },
    linkMetaText: {
        fontSize: 11,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '500',
    },
    linkActions: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sourceActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    statsBar: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        alignItems: 'center',
    },
    statsText: {
        fontSize: 12,
    },
    stubContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    stubTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
    },
    stubDesc: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    stubBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 24,
    },
    stubBadgeText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '600',
    },
    top10Preview: {
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        width: '100%',
    },
    top10Item: {
        fontSize: 13,
        marginBottom: 6,
    },
    // New styles for Top 10 and Curated management
    sectionDesc: {
        fontSize: 13,
    },
    top10Card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    top10Rank: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    top10RankText: {
        fontSize: 16,
        fontWeight: '700',
    },
    top10Info: {
        flex: 1,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    scoreText: {
        fontSize: 12,
    },
    sourceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    sourceText: {
        fontSize: 10,
        fontWeight: '600',
    },
    boostInput: {
        width: 60,
    },
    boostField: {
        width: 60,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        textAlign: 'center',
        fontSize: 14,
    },
    formCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    formInput: {
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 12,
        fontSize: 14,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: 'rgba(128,128,128,0.2)',
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    addButton: {
        height: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '600',
    },
    curatedItem: {
        flexDirection: 'column',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    curatedInfo: {
        flex: 1,
    },
    linkUrl: {
        fontSize: 11,
        marginTop: 2,
    },
    curatedBadges: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
        alignItems: 'center',
    },
    miniBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600',
    },
    boostBadge: {
        fontSize: 11,
    },
    boostInputSmall: {
        width: 50,
        marginRight: 4,
    },
    boostFieldSmall: {
        width: 50,
        height: 32,
        borderRadius: 6,
        borderWidth: 1,
        textAlign: 'center',
        fontSize: 12,
    },
    saveBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        marginLeft: 6,
    },
    saveBtnText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '600',
    },
    saveBtnSmall: {
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 4,
        marginLeft: 4,
    },
    saveBtnSmallText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '600',
    },
    customTitle: {
        fontSize: 12,
        marginTop: 2,
    },
    editorChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        gap: 6,
    },
    editorChipImage: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    editorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 8,
    },
    editorAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    editorInfo: {
        flex: 1,
    },
    editorName: {
        fontSize: 15,
        fontWeight: '600',
    },
    editorDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    // Avatar management styles
    section: {
        flex: 1,
        padding: 16,
    },
    addForm: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    input: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        fontSize: 14,
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 12,
    },
    avatarCard: {
        width: 100,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        position: 'relative',
    },
    avatarPreview: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarLabel: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    deleteAvatarBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
