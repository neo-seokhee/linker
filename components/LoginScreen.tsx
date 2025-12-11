// Login Screen - Kakao OAuth login
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export function LoginScreen() {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const { signInWithKakao, isLoading } = useAuth();
    const [isSigningIn, setIsSigningIn] = React.useState(false);

    const handleKakaoLogin = async () => {
        try {
            setIsSigningIn(true);
            await signInWithKakao();
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            setIsSigningIn(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                {/* Logo/Title */}
                <View style={styles.header}>
                    <View style={[styles.logoContainer, { backgroundColor: colors.accent }]}>
                        <Ionicons name="link" size={48} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Linker</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        링크를 스마트하게 저장하고 관리하세요
                    </Text>
                </View>

                {/* Login Button */}
                <View style={styles.loginSection}>
                    <TouchableOpacity
                        style={styles.kakaoButton}
                        onPress={handleKakaoLogin}
                        disabled={isSigningIn}
                        activeOpacity={0.8}
                    >
                        {isSigningIn ? (
                            <ActivityIndicator size="small" color="#000000" />
                        ) : (
                            <>
                                <View style={styles.kakaoIcon}>
                                    <Text style={styles.kakaoIconText}>💬</Text>
                                </View>
                                <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.terms, { color: colors.textSecondary }]}>
                        로그인하면 서비스 이용약관에 동의하게 됩니다
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 340,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    loginSection: {
        width: '100%',
        alignItems: 'center',
    },
    kakaoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEE500',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    kakaoIcon: {
        marginRight: 8,
    },
    kakaoIconText: {
        fontSize: 20,
    },
    kakaoButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000000',
    },
    terms: {
        fontSize: 12,
        textAlign: 'center',
    },
});
