// Settings Page - Settings and account management
import { CategoryManagementModal } from '@/components/CategoryManagementModal';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { ProfileSetupModal } from '@/components/ProfileSetupModal';
import { SignUpModal } from '@/components/SignUpModal';
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { useLinks } from '@/hooks/useLinks';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/utils/supabaseClient';
import analytics from '@/utils/analytics/analytics';
import { checkConsent, setConsent } from '@/utils/analytics/consent';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mobile-first: max width 390px
const MAX_WIDTH = 390;

export default function SettingsPage() {
    const { effectiveTheme, themeMode, setThemeMode, isDarkMode } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const insets = useSafeAreaInsets();
    const { links } = useLinks();
    const { user, signOut, signInWithKakao } = useAuth();
    const { profile, updateNickname, updateProfile, isLoading: profileLoading } = useProfile();

    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [showSignUpModal, setShowSignUpModal] = useState(false);
    const [showProfileSetupModal, setShowProfileSetupModal] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [nicknameInput, setNicknameInput] = useState('');
    const [avatarInput, setAvatarInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [defaultAvatars, setDefaultAvatars] = useState<{ id: string; url: string; label: string }[]>([]);
    const [newsletterEnabled, setNewsletterEnabled] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

    // Sync newsletter state from profile
    React.useEffect(() => {
        if (profile && user) {
            // Fetch the latest newsletter_enabled status from DB
            const fetchNewsletterStatus = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('newsletter_enabled')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setNewsletterEnabled(data.newsletter_enabled ?? true);
                }
            };
            fetchNewsletterStatus();
        }
    }, [profile, user]);

    // Load analytics consent on mount
    React.useEffect(() => {
        const loadAnalyticsConsent = async () => {
            const consent = await checkConsent();
            setAnalyticsEnabled(consent);
        };
        loadAnalyticsConsent();
    }, []);

    // Supabase Edge Function URL for feedback
    const FEEDBACK_FUNCTION_URL = 'https://tfvgbybllozijozncser.supabase.co/functions/v1/send-feedback';

    const sendFeedback = async () => {
        if (!feedbackText.trim()) {
            showToastNotification('의견을 입력해주세요');
            return;
        }

        setIsSendingFeedback(true);
        try {
            const response = await fetch(FEEDBACK_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: user?.email || null,
                    feedback: feedbackText,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send feedback');
            }

            showToastNotification('의견이 전송되었습니다. 감사합니다!');
            setFeedbackText('');
            setShowFeedbackModal(false);
        } catch (error) {
            console.log('Error sending feedback:', error);
            showToastNotification('의견 전송에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSendingFeedback(false);
        }
    };

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

    const handleLogout = () => {
        showConfirmDialog(
            '로그아웃하시겠습니까?',
            async () => {
                try {
                    await signOut();
                    showToastNotification('로그아웃되었습니다');
                } catch (error) {
                    showToastNotification('로그아웃 중 오류가 발생했습니다');
                }
            }
        );
    };

    const getThemeModeText = () => {
        return isDarkMode ? '다크 모드' : '라이트 모드';
    };

    // Get user display info
    const getUserDisplayName = () => {
        if (!user) return '로그인이 필요합니다';
        return user.user_metadata?.name || user.user_metadata?.full_name || '사용자';
    };

    const getUserEmail = () => {
        if (!user) return '로그인하면 다른 기기에서도 링크를 볼 수 있어요';
        return user.email || '카카오 로그인';
    };

    const handleStartEditProfile = async () => {
        setNicknameInput(profile?.nickname || '');
        setAvatarInput(profile?.avatarUrl || '');
        setIsEditingProfile(true);

        // Fetch default avatars from DB
        const { data } = await supabase
            .from('default_avatars')
            .select('id, url, label')
            .eq('is_active', true)
            .order('order_index', { ascending: true });

        if (data) {
            setDefaultAvatars(data);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setAvatarInput(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (uri: string) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
            const fileName = `${user?.id} -${Date.now()}.${fileExt} `;
            const filePath = `${fileName} `;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    };

    const handleSaveProfile = async () => {
        if (!nicknameInput.trim()) {
            showToastNotification('닉네임을 입력해주세요');
            return;
        }

        setIsUploading(true);
        try {
            let finalAvatarUrl = avatarInput;

            // If avatar input is a local file (from picker), upload it
            if (avatarInput && (avatarInput.startsWith('file://') || avatarInput.startsWith('blob:'))) {
                finalAvatarUrl = await uploadAvatar(avatarInput);
            }

            const success = await updateProfile({
                nickname: nicknameInput.trim(),
                avatarUrl: finalAvatarUrl?.trim() || undefined
            });

            if (success) {
                showToastNotification('프로필이 변경되었습니다');
                setIsEditingProfile(false);
            } else {
                showToastNotification('프로필 변경에 실패했습니다');
            }
        } catch (error: any) {
            console.error('Profile save error:', error);
            const message = error?.message || '업로드/저장 중 오류가 발생했습니다';

            if (message.includes('bucket') || message.includes('not found')) {
                showToastNotification('오류: 스토리지 버킷이 없습니다. SQL을 실행해주세요.');
            } else {
                showToastNotification('오류: ' + message);
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancelEditProfile = () => {
        setIsEditingProfile(false);
        setNicknameInput('');
        setAvatarInput('');
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

                        <TouchableOpacity
                            style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={user ? handleStartEditProfile : undefined}
                            activeOpacity={user ? 0.7 : 1}
                        >
                            {profile?.avatarUrl ? (
                                <Image
                                    source={{ uri: profile.avatarUrl }}
                                    style={[styles.avatar, { backgroundColor: colors.border }]}
                                />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                                    <Ionicons name="person" size={24} color="#000" />
                                </View>
                            )}
                            <View style={styles.accountInfo}>
                                <View style={styles.nicknameRow}>
                                    <Text style={[styles.accountName, { color: colors.text }]}>
                                        {profile?.nickname || getUserDisplayName()}
                                    </Text>
                                    {user && <Ionicons name="pencil" size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />}
                                </View>
                                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
                                    {getUserEmail()}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {user ? (
                            <TouchableOpacity
                                style={[styles.logoutButton, { borderColor: colors.border }]}
                                onPress={handleLogout}
                            >
                                <Ionicons name="log-out-outline" size={18} color="#FF4444" />
                                <Text style={styles.logoutButtonText}>로그아웃</Text>
                            </TouchableOpacity>
                        ) : (
                            <View>
                                <TouchableOpacity
                                    style={[styles.kakaoLoginButton, { backgroundColor: '#FEE500' }]}
                                    onPress={signInWithKakao}
                                >
                                    <Ionicons name="chatbubble" size={18} color="#000" />
                                    <Text style={styles.kakaoLoginButtonText}>카카오 로그인</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ marginTop: 12, padding: 8, alignSelf: 'center' }}
                                    onPress={() => setShowSignUpModal(true)}
                                >
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, textDecorationLine: 'underline' }}>
                                        회원가입
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>


                    {/* App Settings Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>앱 설정</Text>

                        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {user && (
                                <SettingItem
                                    icon="notifications-outline"
                                    title="알림"
                                    subtitle="푸시 알림 설정"
                                    onPress={() => showToastNotification('알림 기능은 추후 업데이트 예정입니다')}
                                />
                            )}
                            {user && (
                                <SettingItem
                                    icon="mail-outline"
                                    title="주간 뉴스레터"
                                    subtitle="매주 월요일 저장 링크 요약 받기"
                                    showArrow={false}
                                    onPress={async () => {
                                        const newValue = !newsletterEnabled;
                                        setNewsletterEnabled(newValue);
                                        await updateProfile({ newsletter_enabled: newValue });
                                        showToastNotification(newValue ? '뉴스레터 구독이 활성화되었습니다' : '뉴스레터 구독이 해제되었습니다');
                                    }}
                                    rightComponent={
                                        <Switch
                                            value={newsletterEnabled}
                                            onValueChange={async (value) => {
                                                setNewsletterEnabled(value);
                                                await updateProfile({ newsletter_enabled: value });
                                                showToastNotification(value ? '뉴스레터 구독이 활성화되었습니다' : '뉴스레터 구독이 해제되었습니다');
                                            }}
                                            trackColor={{ false: colors.border, true: colors.accent }}
                                            thumbColor={newsletterEnabled ? '#fff' : '#f4f3f4'}
                                        />
                                    }
                                />
                            )}
                            <SettingItem
                                icon="analytics-outline"
                                title="분석 데이터 수집"
                                subtitle="앱 개선을 위한 사용 데이터 수집"
                                showArrow={false}
                                onPress={async () => {
                                    const newValue = !analyticsEnabled;
                                    setAnalyticsEnabled(newValue);
                                    await setConsent(newValue);
                                    await analytics.setEnabled(newValue);
                                    showToastNotification(newValue ? '분석 데이터 수집이 활성화되었습니다' : '분석 데이터 수집이 해제되었습니다');
                                }}
                                rightComponent={
                                    <Switch
                                        value={analyticsEnabled}
                                        onValueChange={async (value) => {
                                            setAnalyticsEnabled(value);
                                            await setConsent(value);
                                            await analytics.setEnabled(value);
                                            showToastNotification(value ? '분석 데이터 수집이 활성화되었습니다' : '분석 데이터 수집이 해제되었습니다');
                                        }}
                                        trackColor={{ false: colors.border, true: colors.accent }}
                                        thumbColor={analyticsEnabled ? '#fff' : '#f4f3f4'}
                                    />
                                }
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
                            {user && (
                                <SettingItem
                                    icon="folder-outline"
                                    title="카테고리 관리"
                                    subtitle="카테고리 추가, 수정, 삭제"
                                    onPress={() => setIsCategoryModalVisible(true)}
                                />
                            )}
                        </View>
                    </View>


                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>정보</Text>

                        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <SettingItem
                                icon="chatbubble-ellipses-outline"
                                title="의견 보내기"
                                onPress={() => {
                                    if (!user) {
                                        setShowLoginPrompt(true);
                                        return;
                                    }
                                    setShowFeedbackModal(true);
                                }}
                            />
                            {user && (
                                <SettingItem
                                    icon="document-text-outline"
                                    title="이용약관 및 개인정보 처리방침"
                                    onPress={() => Linking.openURL('https://www.notion.so/neolee/LINKER-2c76e247b035812c939dd2b57680ba27')}
                                />
                            )}
                        </View>

                        {/* Business Info */}
                        <Text style={{
                            color: colors.textSecondary,
                            fontSize: 10,
                            textAlign: 'center',
                            marginTop: 16,
                            lineHeight: 16,
                        }}>
                            LINKER(링커) | 사업자명 : 더포지인더스트리(The Forge Industries){'\n'}
                            사업자등록번호 : 241-25-02034 | 통신판매업신고번호 : 제 2024-서울송파-1849호
                        </Text>
                    </View>

                    {/* Bottom padding */}
                    <View style={{ height: 50 }} />
                </ScrollView>

                {/* Category Management Modal */}
                <CategoryManagementModal
                    visible={isCategoryModalVisible}
                    onClose={() => setIsCategoryModalVisible(false)}
                />

                {/* Login Prompt Modal */}
                <LoginPromptModal
                    visible={showLoginPrompt}
                    onClose={() => setShowLoginPrompt(false)}
                />

                {/* Feedback Modal */}
                <Modal
                    visible={showFeedbackModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowFeedbackModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>의견 보내기</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
                                서비스 개선을 위한 의견을 남겨주세요
                            </Text>

                            <TextInput
                                style={[
                                    styles.feedbackInput,
                                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }
                                ]}
                                placeholder="의견을 입력해주세요..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={4}
                                value={feedbackText}
                                onChangeText={setFeedbackText}
                                textAlignVertical="top"
                            />

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: colors.border, flex: 1 }]}
                                    onPress={() => {
                                        setFeedbackText('');
                                        setShowFeedbackModal(false);
                                    }}
                                >
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: colors.accent, flex: 1 }]}
                                    onPress={sendFeedback}
                                    disabled={isSendingFeedback}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: '600' }}>
                                        {isSendingFeedback ? '전송 중...' : '보내기'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Toast Notification */}
                {showToast && (
                    <View style={styles.toastContainer}>
                        <View style={[styles.toast, { backgroundColor: colors.accent }]}>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.toastText}>{toastMessage}</Text>
                        </View>
                    </View>
                )}

                {/* Sign Up Modal */}
                <SignUpModal
                    visible={showSignUpModal}
                    onClose={() => setShowSignUpModal(false)}
                    onSuccess={() => setShowProfileSetupModal(true)}
                />

                {/* Profile Setup Modal */}
                <ProfileSetupModal
                    visible={showProfileSetupModal}
                    onClose={() => setShowProfileSetupModal(false)}
                />

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

                {/* Profile Edit Modal */}
                <Modal
                    visible={isEditingProfile}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={handleCancelEditProfile}
                >
                    <View style={styles.confirmOverlay}>
                        <View style={[styles.profileEditModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.confirmTitle, { color: colors.text, marginBottom: 20 }]}>프로필 수정</Text>

                            {/* Avatar Preview & Selection */}
                            <TouchableOpacity
                                style={{ alignItems: 'center', marginBottom: 20 }}
                                onPress={pickImage}
                                activeOpacity={0.7}
                            >
                                {avatarInput ? (
                                    <Image
                                        source={{ uri: avatarInput }}
                                        style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.border }}
                                    />
                                ) : (
                                    <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="camera" size={40} color="#000" />
                                    </View>
                                )}
                                <View style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    left: 0,
                                    alignItems: 'center'
                                }}>
                                    <View style={{ backgroundColor: colors.card, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text }}>사진 변경</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Default Avatars Selection */}
                            {defaultAvatars.length > 0 && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>기본 아이콘 선택</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            {defaultAvatars.map((avatar) => (
                                                <TouchableOpacity
                                                    key={avatar.id}
                                                    onPress={() => setAvatarInput(avatar.url)}
                                                    style={{
                                                        alignItems: 'center',
                                                        padding: 4,
                                                        borderRadius: 8,
                                                        borderWidth: avatarInput === avatar.url ? 2 : 0,
                                                        borderColor: colors.accent,
                                                    }}
                                                >
                                                    <Image
                                                        source={{ uri: avatar.url }}
                                                        style={{ width: 50, height: 50, borderRadius: 25 }}
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            {/* Nickname Input */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>닉네임</Text>
                                <TextInput
                                    style={[styles.nicknameInput, { color: colors.text, borderColor: colors.border }]}
                                    value={nicknameInput}
                                    onChangeText={setNicknameInput}
                                    placeholder="닉네임 입력"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            {/* Buttons */}
                            <View style={styles.confirmButtons}>
                                <TouchableOpacity
                                    style={[styles.confirmButton, { backgroundColor: colors.background }]}
                                    onPress={handleCancelEditProfile}
                                >
                                    <Text style={[styles.confirmButtonText, { color: colors.text }]}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmButton, { backgroundColor: colors.accent }]}
                                    onPress={handleSaveProfile}
                                >
                                    <Text style={[styles.confirmButtonText, { color: '#000' }]}>
                                        {isUploading ? '저장 중...' : '저장'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
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
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    logoutButtonText: {
        color: '#FF4444',
        fontSize: 15,
        fontWeight: '600',
    },
    kakaoLoginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 10,
    },
    kakaoLoginButtonText: {
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
    profileEditModal: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 16,
        borderWidth: 1,
        padding: 24,
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
    nicknameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nicknameEditContainer: {
        gap: 8,
    },
    nicknameInput: {
        fontSize: 16,
        fontWeight: '700',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: 8,
        minWidth: 150,
    },
    nicknameEditButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    nicknameButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    nicknameButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    feedbackInput: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        minHeight: 120,
        fontSize: 15,
    },
    modalButton: {
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
});
