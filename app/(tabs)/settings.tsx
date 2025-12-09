// Settings Page - Settings and account management
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Switch,
    Alert,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLinks } from '@/hooks/useLinks';
import { CategoryManagementModal } from '@/components/CategoryManagementModal';

// Mobile-first: max width 390px
const MAX_WIDTH = 390;

export default function SettingsPage() {
    const { effectiveTheme, themeMode, setThemeMode, isDarkMode } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const insets = useSafeAreaInsets();
    const { links } = useLinks();

    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    const showToastNotification = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    const showConfirmDialog = (message: string, onConfirm: () => void) => {
        setConfirmMessage(message);
        setConfirmAction(() => onConfirm);
    };

    const handleConfirm = () => {
        if (confirmAction) {
            confirmAction();
            setConfirmAction(null);
            setConfirmMessage('');
        }
    };

    const handleCancel = () => {
        setConfirmAction(null);
        setConfirmMessage('');
    };

    const handleToggleDarkMode = () => {
        // Toggle between dark and light only
        setThemeMode(isDarkMode ? 'light' : 'dark');
    };

    const handleDataBackup = async () => {
        try {
            const data = await AsyncStorage.getItem('@linker_links');
            if (data) {
                // In a real app, this would save to cloud/file
                showToastNotification(`${links.length}개의 링크가 백업되었습니다`);
            }
        } catch (error) {
            showToastNotification('백업 중 오류가 발생했습니다');
        }
    };

    const handleDeleteAllData = () => {
        showConfirmDialog(
            '저장된 모든 링크가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
            async () => {
                try {
                    await AsyncStorage.removeItem('@linker_links');
                    showToastNotification('모든 데이터가 삭제되었습니다');
                } catch (error) {
                    showToastNotification('삭제 중 오류가 발생했습니다');
                }
            }
        );
    };

    const getThemeModeText = () => {
        return isDarkMode ? '다크 모드' : '라이트 모드';
    };

    const SettingItem = ({
        icon,
        title,
        subtitle,
        onPress,
        showArrow = true,
        rightComponent,
        danger = false,
    }: {
        icon: string;
        title: string;
        subtitle?: string;
        onPress?: () => void;
        showArrow?: boolean;
        rightComponent?: React.ReactNode;
        danger?: boolean;
    }) => (
        <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: danger ? '#FF444420' : colors.card }]}>
                <Ionicons name={icon as any} size={20} color={danger ? '#FF4444' : colors.accent} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: danger ? '#FF4444' : colors.text }]}>{title}</Text>
                {subtitle && (
                    <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {rightComponent}
            {showArrow && !rightComponent && (
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
            <View style={styles.mobileContainer}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <Text style={[styles.title, { color: colors.text }]}>설정</Text>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Account Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>계정</Text>

                        <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                                <Ionicons name="person" size={24} color="#000" />
                            </View>
                            <View style={styles.accountInfo}>
                                <Text style={[styles.accountName, { color: colors.text }]}>로그인이 필요합니다</Text>
                                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
                                    로그인하면 다른 기기에서도 링크를 볼 수 있어요
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, { backgroundColor: colors.accent }]}
                            onPress={() => showToastNotification('로그인 기능은 추후 업데이트 예정입니다')}
                        >
                            <Text style={styles.loginButtonText}>로그인</Text>
                        </TouchableOpacity>
                    </View>

                    {/* App Settings Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>앱 설정</Text>

                        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <SettingItem
                                icon="notifications-outline"
                                title="알림"
                                subtitle="푸시 알림 설정"
                                onPress={() => showToastNotification('알림 기능은 추후 업데이트 예정입니다')}
                            />
                            <SettingItem
                                icon={isDarkMode ? 'moon' : 'sunny'}
                                title="테마"
                                subtitle={getThemeModeText()}
                                showArrow={false}
                                onPress={handleToggleDarkMode}
                                rightComponent={
                                    <View
                                        style={[styles.themeButton, { backgroundColor: colors.background }]}
                                    >
                                        <Ionicons
                                            name={isDarkMode ? 'moon' : 'sunny'}
                                            size={18}
                                            color={colors.accent}
                                        />
                                    </View>
                                }
                            />
                            <SettingItem
                                icon="folder-outline"
                                title="카테고리 관리"
                                subtitle="카테고리 추가, 수정, 삭제"
                                onPress={() => setIsCategoryModalVisible(true)}
                            />
                        </View>
                    </View>

                    {/* Data Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>데이터</Text>

                        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <SettingItem
                                icon="cloud-download-outline"
                                title="데이터 백업"
                                subtitle={`${links.length}개의 링크`}
                                onPress={handleDataBackup}
                            />
                            <SettingItem
                                icon="cloud-upload-outline"
                                title="데이터 복원"
                                subtitle="백업된 데이터를 복원합니다"
                                onPress={() => showToastNotification('복원 기능은 추후 업데이트 예정입니다')}
                            />
                            <SettingItem
                                icon="trash-outline"
                                title="모든 데이터 삭제"
                                subtitle="저장된 모든 링크를 삭제합니다"
                                onPress={handleDeleteAllData}
                                danger
                            />
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>정보</Text>

                        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <SettingItem
                                icon="information-circle-outline"
                                title="앱 정보"
                                subtitle="Linker 버전 1.0.0"
                                onPress={() => showToastNotification('Linker v1.0.0 - URL을 저장하고 관리하는 앱입니다')}
                            />
                            <SettingItem
                                icon="document-text-outline"
                                title="이용약관"
                                onPress={() => showToastNotification('이용약관 내용이 여기에 표시됩니다')}
                            />
                            <SettingItem
                                icon="shield-checkmark-outline"
                                title="개인정보 처리방침"
                                onPress={() => showToastNotification('개인정보 처리방침 내용이 여기에 표시됩니다')}
                            />
                        </View>
                    </View>

                    {/* Bottom padding */}
                    <View style={{ height: 50 }} />
                </ScrollView>

                {/* Category Management Modal */}
                <CategoryManagementModal
                    visible={isCategoryModalVisible}
                    onClose={() => setIsCategoryModalVisible(false)}
                />

                {/* Toast Notification */}
                {showToast && (
                    <View style={styles.toastContainer}>
                        <View style={[styles.toast, { backgroundColor: colors.accent }]}>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.toastText}>{toastMessage}</Text>
                        </View>
                    </View>
                )}

                {/* Confirm Dialog */}
                {confirmMessage && (
                    <View style={styles.confirmOverlay}>
                        <View style={[styles.confirmDialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.confirmTitle, { color: colors.text }]}>확인</Text>
                            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>{confirmMessage}</Text>
                            <View style={styles.confirmButtons}>
                                <TouchableOpacity
                                    style={[styles.confirmButton, { backgroundColor: colors.background }]}
                                    onPress={handleCancel}
                                >
                                    <Text style={[styles.confirmButtonText, { color: colors.text }]}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmButton, { backgroundColor: colors.accent }]}
                                    onPress={handleConfirm}
                                >
                                    <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>확인</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View >
        </View >
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        alignItems: 'center',
    },
    mobileContainer: {
        flex: 1,
        width: '100%',
        maxWidth: MAX_WIDTH,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 12,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountInfo: {
        flex: 1,
        marginLeft: 12,
    },
    accountName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 3,
    },
    accountEmail: {
        fontSize: 12,
    },
    loginButton: {
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '600',
    },
    settingsGroup: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 11,
        marginTop: 1,
    },
    themeButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastContainer: {
        position: 'absolute',
        top: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxWidth: 350,
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
    },
    confirmDialog: {
        width: '80%',
        maxWidth: 320,
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    confirmMessage: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
