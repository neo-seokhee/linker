// Admin Page - Complete Admin Dashboard
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ADMIN_PASSWORD = '71996565';

type AdminSection = 'home' | 'links' | 'users' | 'top10' | 'curated';
type LinkFilter = 'all' | 'featured' | 'hidden';

interface AdminLink {
    id: string;
    url: string;
    og_title: string;
    og_image: string | null;
    is_featured: boolean;
    is_public: boolean;
    created_at: string;
    user_id: string;
    category_id: string;
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
    nickname: string | null;
    profile_image: string | null;
    show_in_feed: boolean;
    show_in_featured: boolean;
    show_in_top10: boolean;
    boost_score: number;
    category: string;
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

    // Top 10 full data with scores
    const [top10FullData, setTop10FullData] = useState<(AdminLink & { source: 'user' | 'curated', totalScore: number })[]>([]);

    // Load data when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadLinks();
            loadStats();
        }
    }, [isAuthenticated, filter]);

    // Load curated links when curated section is opened
    useEffect(() => {
        if (isAuthenticated && currentSection === 'curated') {
            loadCuratedLinks();
        }
    }, [isAuthenticated, currentSection]);

    // Load Top 10 full data when top10 section is opened
    useEffect(() => {
        if (isAuthenticated && currentSection === 'top10') {
            loadTop10Full();
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

            // Get all links with their boost_score
            const linkIds = Object.keys(likeCountMap);
            let userLinks: any[] = [];

            if (linkIds.length > 0) {
                const { data } = await supabase
                    .from('links')
                    .select('id, url, og_title, og_image, boost_score, user_id')
                    .in('id', linkIds);
                userLinks = data || [];
            }

            // Get curated links that should show in top10
            const { data: curatedTop10 } = await supabase
                .from('curated_links')
                .select('*')
                .eq('show_in_top10', true);

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

        const { error } = await supabase.from('curated_links').insert({
            url: newCuratedUrl.trim(),
            title: newCuratedTitle.trim(),
            thumbnail: newCuratedThumbnail.trim() || null,
            nickname: newCuratedNickname.trim() || null,
            profile_image: newCuratedProfileImage.trim() || null,
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

        const { error } = await supabase.from('curated_links').delete().eq('id', id);
        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
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
            // Build query
            let query = supabase
                .from('links')
                .select('id, url, og_title, og_image, is_featured, is_public, created_at, user_id, category_id')
                .order('created_at', { ascending: false });

            // Apply filter
            if (filter === 'featured') {
                query = query.eq('is_featured', true);
            } else if (filter === 'hidden') {
                query = query.eq('is_public', false);
            }

            const { data, error } = await query.limit(100);

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

            // Combine all data
            const enrichedLinks: AdminLink[] = data.map(link => ({
                ...link,
                author_nickname: nicknameMap[link.user_id] || 'Unknown',
                category_name: categoryMap[link.category_id] || '미분류',
                likes_count: likeCountMap[link.id] || 0,
            }));

            setLinks(enrichedLinks);
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

        // Perform delete and select the deleted record to verify
        const { data, error } = await supabase
            .from('links')
            .delete()
            .eq('id', linkId)
            .select();

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else if (!data || data.length === 0) {
            // No error, but no data deleted -> Likely RLS restriction
            alert('삭제 실패: 권한이 없거나 이미 삭제된 항목입니다.\n(DB 관리자가 아니라면 삭제 권한이 없을 수 있습니다)');
        } else {
            // Success
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
                {(['all', 'featured', 'hidden'] as LinkFilter[]).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[
                            styles.filterTab,
                            filter === f && { borderBottomColor: colors.accent, borderBottomWidth: 2 }
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterTabText, { color: filter === f ? colors.accent : colors.textSecondary }]}>
                            {f === 'all' ? '전체' : f === 'featured' ? '추천' : '비공개'}
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>큐레이션 링크 등록</Text>

            {/* Add Form */}
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="URL"
                    placeholderTextColor={colors.textSecondary}
                    value={newCuratedUrl}
                    onChangeText={setNewCuratedUrl}
                />
                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="제목"
                    placeholderTextColor={colors.textSecondary}
                    value={newCuratedTitle}
                    onChangeText={setNewCuratedTitle}
                />
                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="썸네일 URL (선택)"
                    placeholderTextColor={colors.textSecondary}
                    value={newCuratedThumbnail}
                    onChangeText={setNewCuratedThumbnail}
                />
                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="유저 닉네임 (선택)"
                    placeholderTextColor={colors.textSecondary}
                    value={newCuratedNickname}
                    onChangeText={setNewCuratedNickname}
                />
                <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="유저 프로필 이미지 URL (선택)"
                    placeholderTextColor={colors.textSecondary}
                    value={newCuratedProfileImage}
                    onChangeText={setNewCuratedProfileImage}
                />
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
                            <View style={styles.curatedBadges}>
                                {link.show_in_feed && <View style={[styles.miniBadge, { backgroundColor: '#3B82F6' }]}><Text style={styles.miniBadgeText}>피드</Text></View>}
                                {link.show_in_featured && <View style={[styles.miniBadge, { backgroundColor: '#10B981' }]}><Text style={styles.miniBadgeText}>추천</Text></View>}
                                {link.show_in_top10 && <View style={[styles.miniBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.miniBadgeText}>Top10</Text></View>}
                                <Text style={[styles.boostBadge, { color: colors.textSecondary }]}>🚀 {link.boost_score}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                            onPress={() => deleteCuratedLink(link.id)}
                        >
                            <Ionicons name="trash" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                ))
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );

    const getSectionTitle = () => {
        switch (currentSection) {
            case 'home': return '관리자 대시보드';
            case 'links': return '추천 링크 관리';
            case 'users': return '유저 관리';
            case 'top10': return 'Top 10 관리';
            case 'curated': return '큐레이션 관리';
        }
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
                </View>

                {/* Content Area */}
                <View style={styles.contentArea}>
                    {currentSection === 'links' && renderLinks()}
                    {currentSection === 'users' && renderUsers()}
                    {currentSection === 'top10' && renderTop10()}
                    {currentSection === 'curated' && renderCurated()}
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
        flexDirection: 'row',
        alignItems: 'center',
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
});
