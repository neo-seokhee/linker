// InAppBrowserModal - Custom in-app browser with header, action bar, and inline save
import Colors from '@/constants/Colors';
import { Category } from '@/constants/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { useLinks } from '@/hooks/useLinks';
import analytics from '@/utils/analytics/analytics';
import { ANALYTICS_EVENTS } from '@/utils/analytics/events';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { LoginPromptModal } from './LoginPromptModal';

interface LinkInfo {
    id: string;
    url: string;
    title: string;
    thumbnail?: string;
    description?: string;
}

interface InAppBrowserModalProps {
    visible: boolean;
    linkInfo: LinkInfo | null;
    onClose: () => void;
    onLike?: (id: string) => void;
    isLiked?: boolean;
    source?: 'explore_feed' | 'storage' | 'featured' | 'top10';
}

export function InAppBrowserModal({
    visible,
    linkInfo,
    onClose,
    onLike,
    isLiked = false,
    source = 'explore_feed',
}: InAppBrowserModalProps) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const insets = useSafeAreaInsets();
    const { session } = useAuth();
    const { addLink, categories } = useLinks();

    const [isLoading, setIsLoading] = useState(true);
    const [currentTitle, setCurrentTitle] = useState(linkInfo?.title || '');
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Dwell time tracking (Native only)
    const openTimestampRef = useRef<number>(0);

    // Track modal open time
    useEffect(() => {
        if (visible && linkInfo && Platform.OS !== 'web') {
            openTimestampRef.current = Date.now();
        }
    }, [visible, linkInfo]);

    if (!linkInfo) return null;

    // Track dwell time and close modal
    const handleClose = () => {
        // Track dwell time on native only
        if (Platform.OS !== 'web' && openTimestampRef.current > 0) {
            const dwellTime = (Date.now() - openTimestampRef.current) / 1000;

            analytics.logEvent(ANALYTICS_EVENTS.LINK_DWELL, {
                link_id: linkInfo.id,
                duration_seconds: Math.round(dwellTime),
                is_engaged: dwellTime > 30,
                source: source,
            });

            openTimestampRef.current = 0;
        }

        onClose();
    };

    const handleLike = () => {
        if (!session) {
            setShowLoginPrompt(true);
            return;
        }
        onLike?.(linkInfo.id);
    };

    const handleSave = () => {
        if (!session) {
            setShowLoginPrompt(true);
            return;
        }
        setShowCategoryPicker(true);
    };

    const handleConfirmSave = async (categoryId: string) => {
        setIsSaving(true);
        try {
            await addLink({
                url: linkInfo.url,
                ogTitle: currentTitle || linkInfo.title,
                ogImage: linkInfo.thumbnail || '',
                ogDescription: linkInfo.description || '',
                categoryId: categoryId,
                isFavorite: false,
                isPublic: true,
            });
            setShowCategoryPicker(false);
            Alert.alert('저장 완료', '보관함에 저장되었습니다!');
        } catch (error) {
            Alert.alert('오류', '저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // Extract domain for display
    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[
                    styles.header,
                    {
                        backgroundColor: colors.background,
                        paddingTop: insets.top + 8,
                        borderBottomColor: colors.border,
                    }
                ]}>
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: colors.card }]}
                        onPress={handleClose}
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                            {currentTitle || linkInfo.title}
                        </Text>
                        <Text style={[styles.headerDomain, { color: colors.textSecondary }]} numberOfLines={1}>
                            {getDomain(linkInfo.url)}
                        </Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* WebView */}
                <View style={styles.webViewContainer}>
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={colors.accent} />
                        </View>
                    )}
                    <WebView
                        source={{ uri: linkInfo.url }}
                        style={styles.webView}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                        onNavigationStateChange={(navState) => {
                            if (navState.title) {
                                setCurrentTitle(navState.title);
                            }
                        }}
                        startInLoadingState
                        javaScriptEnabled
                        domStorageEnabled
                        sharedCookiesEnabled
                    />
                </View>

                {/* Bottom Action Bar */}
                <View style={[
                    styles.bottomBar,
                    {
                        backgroundColor: colors.background,
                        paddingBottom: insets.bottom + 12,
                        borderTopColor: colors.border,
                    }
                ]}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: isLiked ? colors.accent : colors.card }
                        ]}
                        onPress={handleLike}
                    >
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={22}
                            color={isLiked ? '#FFFFFF' : colors.text}
                        />
                        <Text style={[
                            styles.actionButtonText,
                            { color: isLiked ? '#FFFFFF' : colors.text }
                        ]}>
                            좋아요
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.accent }]}
                        onPress={handleSave}
                    >
                        <Ionicons name="bookmark-outline" size={22} color="#FFFFFF" />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                            저장하기
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Category Picker Bottom Sheet */}
                {showCategoryPicker && (
                    <View style={styles.categoryPickerOverlay}>
                        <TouchableOpacity
                            style={styles.categoryPickerBackdrop}
                            onPress={() => setShowCategoryPicker(false)}
                            activeOpacity={1}
                        />
                        <View style={[
                            styles.categoryPickerSheet,
                            {
                                backgroundColor: colors.background,
                                paddingBottom: insets.bottom + 20,
                            }
                        ]}>
                            <View style={styles.categoryPickerHandle}>
                                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                            </View>
                            <Text style={[styles.categoryPickerTitle, { color: colors.text }]}>
                                카테고리 선택
                            </Text>
                            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
                                {categories.map((category: Category) => (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryItem,
                                            { backgroundColor: colors.card, borderColor: colors.border }
                                        ]}
                                        onPress={() => handleConfirmSave(category.id)}
                                        disabled={isSaving}
                                    >
                                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                                        <Text style={[styles.categoryName, { color: colors.text }]}>
                                            {category.name}
                                        </Text>
                                        {isSaving && (
                                            <ActivityIndicator size="small" color={colors.accent} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                )}
            </View>

            {/* Login Prompt Modal */}
            <LoginPromptModal
                visible={showLoginPrompt}
                onClose={() => setShowLoginPrompt(false)}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerDomain: {
        fontSize: 12,
        marginTop: 2,
    },
    webViewContainer: {
        flex: 1,
    },
    webView: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 1,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    // Category Picker Styles
    categoryPickerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
    categoryPickerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    categoryPickerSheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
    },
    categoryPickerHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    categoryPickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 16,
    },
    categoryList: {
        paddingHorizontal: 20,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
        gap: 12,
    },
    categoryIcon: {
        fontSize: 24,
    },
    categoryName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
});
