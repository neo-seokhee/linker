// LinkCard component - Displays a link with OG image, title, date, and edit/delete options
import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
    Modal,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Link } from '@/constants/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLinks } from '@/hooks/useLinks';

// Mobile-first: max width 390px (iPhone 14 width)
const MAX_CONTAINER_WIDTH = 390;

interface LinkCardProps {
    link: Link;
    onPress: () => void;
    onFavoriteToggle: () => void;
}

export function LinkCard({ link, onPress, onFavoriteToggle }: LinkCardProps) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const { width: screenWidth } = useWindowDimensions();
    const { updateLink, removeLink } = useLinks();

    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editTitle, setEditTitle] = useState(link.customTitle || link.ogTitle);
    const [isAlertShowing, setIsAlertShowing] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // Use mobile width or actual screen width (whichever is smaller)
    const containerWidth = Math.min(screenWidth, MAX_CONTAINER_WIDTH);
    const cardWidth = (containerWidth - 36) / 2; // 2 columns with gap

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return '오늘';
        if (diffDays === 1) return '어제';
        if (diffDays < 7) return `${diffDays}일 전`;

        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    };

    const handleEdit = () => {
        setShowMenu(false);
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        await updateLink(link.id, {
            customTitle: editTitle.trim() !== link.ogTitle ? editTitle.trim() : undefined,
        });
        setShowEditModal(false);
    };

    const handleDelete = () => {
        setShowMenu(false);

        const confirmDelete = () => {
            removeLink(link.id);
        };

        if (Platform.OS === 'web') {
            if (confirm('이 링크를 삭제하시겠습니까?')) {
                confirmDelete();
            }
        } else {
            Alert.alert(
                '링크 삭제',
                '이 링크를 삭제하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: confirmDelete },
                ]
            );
        }
    };

    const displayTitle = link.customTitle || link.ogTitle;

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        width: cardWidth,
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={[styles.imageContainer, { height: cardWidth * 0.55 }]}>
                    <Image
                        source={{ uri: link.ogImage }}
                        style={styles.image}
                        resizeMode="cover"
                        defaultSource={require('@/assets/images/placeholder.png')}
                    />
                    <TouchableOpacity
                        style={[styles.favoriteButton, { backgroundColor: colors.background + 'CC' }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            onFavoriteToggle();
                        }}
                    >
                        <Ionicons
                            name={link.isFavorite ? 'star' : 'star-outline'}
                            size={14}
                            color={link.isFavorite ? colors.accentAlt : colors.textSecondary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuButton, { backgroundColor: colors.background + 'CC' }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            setShowMenu(true);
                        }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.content}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                        {displayTitle}
                    </Text>
                    <View style={styles.footer}>
                        <Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={1}>
                            {new URL(link.url).hostname.replace('www.', '')}
                        </Text>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>
                            {formatDate(link.createdAt)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Menu Modal */}
            <Modal
                visible={showMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                            <Ionicons name="create-outline" size={20} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>제목 수정</Text>
                        </TouchableOpacity>
                        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            setShowMenu(false);

                            if (Platform.OS === 'web') {
                                navigator.clipboard.writeText(link.url);
                                // Show toast instead of alert
                                setTimeout(() => {
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                }, 100);
                            } else {
                                // For native, would use @react-native-clipboard/clipboard
                                Alert.alert('링크 복사', link.url);
                            }
                        }}>
                            <Ionicons name="copy-outline" size={20} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>링크 복사</Text>
                        </TouchableOpacity>
                        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            <Text style={[styles.menuText, { color: '#EF4444' }]}>삭제</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.editOverlay}>
                    <View style={[styles.editContainer, { backgroundColor: colors.background }]}>
                        <View style={[styles.editHeader, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>취소</Text>
                            </TouchableOpacity>
                            <Text style={[styles.editTitle, { color: colors.text }]}>제목 수정</Text>
                            <TouchableOpacity onPress={handleSaveEdit}>
                                <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>저장</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.editContent}>
                            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>제목</Text>
                            <TextInput
                                style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                value={editTitle}
                                onChangeText={setEditTitle}
                                placeholder={link.ogTitle}
                                placeholderTextColor={colors.textSecondary}
                                multiline
                            />
                            <Text style={[styles.editHelper, { color: colors.textSecondary }]}>
                                원본 제목: {link.ogTitle}
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Toast Notification */}
            {showToast && (
                <View style={styles.toastContainer}>
                    <View style={[styles.toast, { backgroundColor: colors.accent }]}>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.toastText}>링크가 복사되었습니다</Text>
                    </View>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 12,
    },
    imageContainer: {
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    favoriteButton: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuButton: {
        position: 'absolute',
        top: 6,
        left: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 10,
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        marginBottom: 6,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    url: {
        fontSize: 10,
        flex: 1,
        marginRight: 4,
    },
    date: {
        fontSize: 9,
        fontWeight: '500',
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 160,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
    },
    editOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    editContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '50%',
    },
    editHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    editTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    editContent: {
        padding: 20,
    },
    editLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },
    editInput: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    editHelper: {
        fontSize: 11,
        marginTop: 8,
    },
    toastContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
