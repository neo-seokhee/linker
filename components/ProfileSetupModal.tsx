// ProfileSetupModal - Post-signup nickname and avatar selection
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Fallback avatar URL (used when DB avatars not loaded yet)
const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/shapes/png?seed=default&backgroundColor=b6e3f4&size=80';

// Random Korean nickname generator
const ADJECTIVES = ['행복한', '신나는', '용감한', '귀여운', '멋진', '빛나는', '따뜻한', '활발한', '순수한', '씩씩한'];
const NOUNS = ['사자', '펭귄', '토끼', '고양이', '강아지', '곰돌이', '여우', '판다', '코알라', '호랑이'];

const generateRandomNickname = (): string => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj} ${noun}`;
};

interface ProfileSetupModalProps {
    visible: boolean;
    onClose: () => void;
    onComplete?: () => void;
}

export const ProfileSetupModal = ({ visible, onClose, onComplete }: ProfileSetupModalProps) => {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];

    const [nickname, setNickname] = useState('');
    const [placeholderNickname, setPlaceholderNickname] = useState('');
    const [selectedAvatarId, setSelectedAvatarId] = useState('');
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('');
    const [avatarsFromDB, setAvatarsFromDB] = useState<{ id: string; url: string; label: string }[]>([]);
    const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        // Load current profile data and avatars
        const loadProfileData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            // Fetch default avatars from DB
            const { data: avatars } = await supabase
                .from('default_avatars')
                .select('id, url, label')
                .eq('is_active', true)
                .order('order_index', { ascending: true });

            if (avatars && avatars.length > 0) {
                setAvatarsFromDB(avatars);
            }

            if (user) {
                // Get existing profile data
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('nickname, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    // Pre-fill with existing data from Kakao
                    if (profile.nickname) {
                        setNickname(profile.nickname);
                        setPlaceholderNickname(profile.nickname);
                    } else {
                        setPlaceholderNickname(generateRandomNickname());
                    }

                    if (profile.avatar_url) {
                        // Check if it's a custom avatar (not in default avatars)
                        const isDefaultAvatar = avatars?.some(a => a.url === profile.avatar_url);
                        if (isDefaultAvatar) {
                            const avatar = avatars?.find(a => a.url === profile.avatar_url);
                            if (avatar) {
                                setSelectedAvatarId(avatar.id);
                                setSelectedAvatarUrl(avatar.url);
                            }
                        } else {
                            // It's a custom avatar (Kakao or uploaded)
                            setSelectedAvatarId('custom');
                            setCustomAvatarUri(profile.avatar_url);
                        }
                    } else if (avatars && avatars.length > 0) {
                        // No avatar yet, select first default
                        setSelectedAvatarId(avatars[0].id);
                        setSelectedAvatarUrl(avatars[0].url);
                    }
                } else {
                    // No profile yet, use defaults
                    setPlaceholderNickname(generateRandomNickname());
                    if (avatars && avatars.length > 0) {
                        setSelectedAvatarId(avatars[0].id);
                        setSelectedAvatarUrl(avatars[0].url);
                    }
                }
            }
        };

        loadProfileData();
    }, []);

    if (!isMounted) return null;

    const showAlert = (title: string, message: string, callback?: () => void) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
            if (callback) callback();
        } else {
            const Alert = require('react-native').Alert;
            Alert.alert(title, message, callback ? [{ text: '확인', onPress: callback }] : undefined);
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setCustomAvatarUri(result.assets[0].uri);
                setSelectedAvatarId('custom');
            }
        } catch (error) {
            console.error('Image picker error:', error);
            showAlert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
        }
    };

    const uploadCustomAvatar = async (uri: string): Promise<string | null> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // For web, fetch the blob
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileExt = 'png';
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, { contentType: 'image/png' });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                return null;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            return null;
        }
    };

    const getAvatarUrl = async (): Promise<string> => {
        if (selectedAvatarId === 'custom' && customAvatarUri) {
            const uploadedUrl = await uploadCustomAvatar(customAvatarUri);
            return uploadedUrl || '';
        }
        // Return the selected avatar URL from DB
        return selectedAvatarUrl || (avatarsFromDB[0]?.url ?? '');
    };

    const handleSave = async () => {
        const finalNickname = nickname.trim() || placeholderNickname;

        if (!finalNickname) {
            showAlert('알림', '닉네임을 입력해주세요.');
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showAlert('오류', '로그인이 필요합니다.');
                setLoading(false);
                return;
            }

            const avatarUrl = await getAvatarUrl();

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    nickname: finalNickname,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });

            if (error) {
                console.error('Profile update error:', error);
                showAlert('오류', '프로필 저장에 실패했습니다.');
                return;
            }

            showAlert('완료', '프로필이 설정되었습니다!', () => {
                onComplete?.();
                onClose();
            });
        } catch (error) {
            console.error('Save error:', error);
            showAlert('오류', '프로필 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.content, { backgroundColor: colors.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>프로필 설정</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            나를 표현할 닉네임과 프로필 사진을 설정해보세요!
                        </Text>

                        {/* Nickname Input */}
                        <Text style={[styles.label, { color: colors.text }]}>닉네임 *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder={placeholderNickname}
                            placeholderTextColor={colors.textSecondary}
                            value={nickname}
                            onChangeText={setNickname}
                            maxLength={20}
                        />
                        <Text style={[styles.hint, { color: colors.textSecondary }]}>
                            입력하지 않으면 "{placeholderNickname}"로 설정됩니다
                        </Text>

                        {/* Avatar Selection */}
                        <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>프로필 이미지</Text>
                        <View style={styles.avatarGrid}>
                            {avatarsFromDB.map((avatar) => (
                                <TouchableOpacity
                                    key={avatar.id}
                                    style={[
                                        styles.avatarOption,
                                        { borderColor: selectedAvatarId === avatar.id ? colors.accent : colors.border },
                                        selectedAvatarId === avatar.id && styles.avatarSelected,
                                    ]}
                                    onPress={() => {
                                        setSelectedAvatarId(avatar.id);
                                        setSelectedAvatarUrl(avatar.url);
                                        setCustomAvatarUri(null);
                                    }}
                                >
                                    <Image source={{ uri: avatar.url }} style={styles.avatarImage} />
                                    {selectedAvatarId === avatar.id && (
                                        <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                                            <Ionicons name="checkmark" size={12} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}

                            {/* Custom Upload Option */}
                            <TouchableOpacity
                                style={[
                                    styles.avatarOption,
                                    styles.uploadOption,
                                    { borderColor: selectedAvatarId === 'custom' ? colors.accent : colors.border },
                                    selectedAvatarId === 'custom' && styles.avatarSelected,
                                ]}
                                onPress={handlePickImage}
                            >
                                {customAvatarUri ? (
                                    <Image source={{ uri: customAvatarUri }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.uploadPlaceholder}>
                                        <Ionicons name="camera" size={24} color={colors.textSecondary} />
                                        <Text style={[styles.uploadText, { color: colors.textSecondary }]}>업로드</Text>
                                    </View>
                                )}
                                {selectedAvatarId === 'custom' && customAvatarUri && (
                                    <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                                        <Ionicons name="checkmark" size={12} color="#FFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitButtonText}>시작하기</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '85%',
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 20,
        position: 'relative',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        position: 'absolute',
        right: 20,
    },
    form: {
        paddingHorizontal: 20,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        fontSize: 14,
    },
    hint: {
        fontSize: 12,
        marginTop: 4,
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    avatarOption: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    avatarSelected: {
        borderWidth: 3,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadOption: {
        backgroundColor: 'rgba(128,128,128,0.1)',
    },
    uploadPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadText: {
        fontSize: 10,
        marginTop: 2,
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
    },
    submitButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

// Export default avatar URL for use in other components
export { DEFAULT_AVATAR_URL };
