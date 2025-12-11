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

type AdminSection = 'home' | 'links' | 'users' | 'top10';
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
    // Joined data
    author_nickname?: string;
    category_name?: string;
    likes_count?: number;
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

    // Load data when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadLinks();
            loadStats();
        }
    }, [isAuthenticated, filter]);

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

    // Top 10 Management Stub
    const renderTop10 = () => (
        <View style={styles.stubContainer}>
            <Ionicons name="trophy" size={64} color={colors.textSecondary} />
            <Text style={[styles.stubTitle, { color: colors.text }]}>Top 10 관리</Text>
            <Text style={[styles.stubDesc, { color: colors.textSecondary }]}>
                이번 주 인기 링크 {top10Preview.length}개
            </Text>
            {top10Preview.length > 0 && (
                <View style={[styles.top10Preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {top10Preview.slice(0, 3).map((link, idx) => (
                        <Text key={link.id} style={[styles.top10Item, { color: colors.text }]} numberOfLines={1}>
                            {idx + 1}. {link.og_title}
                        </Text>
                    ))}
                </View>
            )}
            <View style={[styles.stubBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.stubBadgeText}>추후 구현 예정</Text>
            </View>
        </View>
    );

    const getSectionTitle = () => {
        switch (currentSection) {
            case 'home': return '관리자 대시보드';
            case 'links': return '추천 링크 관리';
            case 'users': return '유저 관리';
            case 'top10': return 'Top 10 관리';
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
                </View>

                {/* Content Area */}
                <View style={styles.contentArea}>
                    {currentSection === 'links' && renderLinks()}
                    {currentSection === 'users' && renderUsers()}
                    {currentSection === 'top10' && renderTop10()}
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
});
