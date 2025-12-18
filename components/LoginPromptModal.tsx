// LoginPromptModal - Styled popup for login-required actions
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LoginPromptModalProps {
    visible: boolean;
    onClose: () => void;
}

export function LoginPromptModal({ visible, onClose }: LoginPromptModalProps) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const { signInWithKakao } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        onClose();
        try {
            await signInWithKakao();
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.iconWrapper}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
                            <Ionicons name="lock-closed" size={32} color={colors.accent} />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        로그인이 필요해요
                    </Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        이 기능을 사용하려면 로그인이 필요합니다.{'\n'}
                        카카오 계정으로 간편하게 시작하세요!
                    </Text>

                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: colors.background }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.buttonText, { color: colors.text }]}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.loginButton, { backgroundColor: '#FEE500' }]}
                            onPress={handleLogin}
                        >
                            <Ionicons name="chatbubble" size={16} color="#000" />
                            <Text style={[styles.buttonText, { color: '#000' }]}>카카오 로그인</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        width: '85%',
        maxWidth: 340,
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
    },
    iconWrapper: {
        marginBottom: 16,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 24,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    loginButton: {},
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
