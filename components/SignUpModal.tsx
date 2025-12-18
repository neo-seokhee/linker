
import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface SignUpModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const SignUpModal = ({ visible, onClose, onSuccess }: SignUpModalProps) => {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [gender, setGender] = useState<'M' | 'F' | null>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(true); // Default checked

    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const formatPhoneNumber = (value: string) => {
        // Remove non-numeric characters
        const cleaned = value.replace(/\D/g, '');
        // Limit to 11 digits
        const limited = cleaned.slice(0, 11);

        if (limited.length <= 3) {
            return limited;
        } else if (limited.length <= 7) {
            return `${limited.slice(0, 3)}-${limited.slice(3)}`;
        } else {
            return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
        }
    };

    const handlePhoneChange = (text: string) => {
        setPhone(formatPhoneNumber(text));
    };

    const handleLinkPress = () => {
        Linking.openURL('https://www.notion.so/neolee/LINKER-2c76e247b035812c939dd2b57680ba27');
    };

    const showAlert = (title: string, message: string, callback?: () => void) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
            if (callback) callback();
        } else {
            Alert.alert(title, message, callback ? [{ text: '확인', onPress: callback }] : undefined);
        }
    };

    const handleSignUp = async () => {
        console.log('Attempting sign up with:', { email, name, phone });

        // Validation
        if (!email || !password || !confirmPassword || !name || !phone || !birthdate || !gender) {
            showAlert('알림', '모든 정보를 입력해주세요.');
            return;
        }

        if (!agreedToTerms) {
            showAlert('알림', '이용약관 및 개인정보 처리방침에 동의해주세요.');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('알림', '비밀번호가 일치하지 않습니다.');
            return;
        }

        // Password complexity: Special char, Uppercase, Lowercase, 6+ chars
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{6,})/;
        if (!passwordRegex.test(password)) {
            showAlert('알림', '비밀번호는 영문 대문자, 소문자, 특수문자를 포함하여 6자 이상이어야 합니다.');
            return;
        }

        // Email validation regex (simple)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('알림', '유효한 이메일 주소를 입력해주세요.');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        phone,
                        birthdate,
                        gender,
                        full_name: name,
                    },
                },
            });

            if (error) {
                console.error('Supabase Sign Up Error:', error);
                throw error;
            }

            console.log('Sign Up Success:', data);

            if (data.session) {
                // Auto login case (Email confirmation OFF or disabled)
                showAlert('회원가입 완료', '프로필을 설정해보세요!', () => {
                    onClose();
                    onSuccess?.();
                });
            } else if (data.user) {
                // Email confirmation ON case
                showAlert('회원가입 완료', '회원가입이 성공했습니다. 이메일 인증을 확인해주세요.', onClose);
            }
        } catch (error: any) {
            console.error('Catch Error:', error);
            // Handle duplicate user error specifically
            if (error.message?.includes('User already registered') || error.message?.includes('already registered')) {
                showAlert('알림', '이미 가입된 이메일입니다. 로그인해주세요.', onClose);
            } else {
                showAlert('회원가입 실패', error.message || '오류가 발생했습니다. 다시 시도해주세요.');
            }
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.content, { backgroundColor: colors.card }]}>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>회원가입</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                            {/* Name */}
                            <Text style={[styles.label, { color: colors.text }]}>이름</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="이름을 입력하세요"
                                placeholderTextColor={colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                            />

                            {/* Phone */}
                            <Text style={[styles.label, { color: colors.text }]}>전화번호</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="010-0000-0000"
                                placeholderTextColor={colors.textSecondary}
                                value={phone}
                                onChangeText={handlePhoneChange}
                                keyboardType="phone-pad"
                                maxLength={13}
                            />

                            {/* DOB */}
                            <Text style={[styles.label, { color: colors.text }]}>생년월일</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="YYYYMMDD (예: 19900101)"
                                placeholderTextColor={colors.textSecondary}
                                value={birthdate}
                                onChangeText={setBirthdate}
                                keyboardType="number-pad"
                                maxLength={8}
                            />

                            {/* Gender */}
                            <Text style={[styles.label, { color: colors.text }]}>성별</Text>
                            <View style={styles.genderContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.genderButton,
                                        { borderColor: colors.border },
                                        gender === 'M' && { backgroundColor: colors.accent, borderColor: colors.accent }
                                    ]}
                                    onPress={() => setGender('M')}
                                >
                                    <Text style={[
                                        styles.genderText,
                                        { color: colors.textSecondary },
                                        gender === 'M' && { color: '#FFF' }
                                    ]}>남성</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.genderButton,
                                        { borderColor: colors.border },
                                        gender === 'F' && { backgroundColor: colors.accent, borderColor: colors.accent }
                                    ]}
                                    onPress={() => setGender('F')}
                                >
                                    <Text style={[
                                        styles.genderText,
                                        { color: colors.textSecondary },
                                        gender === 'F' && { color: '#FFF' }
                                    ]}>여성</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Email */}
                            <Text style={[styles.label, { color: colors.text }]}>이메일</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="example@email.com"
                                placeholderTextColor={colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {/* Password */}
                            <Text style={[styles.label, { color: colors.text }]}>비밀번호</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="영문 대/소문자, 특수문자 포함 6자 이상"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />

                            {/* Confirm Password */}
                            <Text style={[styles.label, { color: colors.text }]}>비밀번호 확인</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="비밀번호 확인"
                                placeholderTextColor={colors.textSecondary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />

                            <View style={{ height: 20 }} />
                        </ScrollView>

                        <View style={styles.footer}>
                            {/* Terms of Service Checkbox */}
                            <TouchableOpacity
                                style={styles.termsContainer}
                                onPress={() => setAgreedToTerms(!agreedToTerms)}
                            >
                                <Ionicons
                                    name={agreedToTerms ? "checkbox" : "square-outline"}
                                    size={24}
                                    color={agreedToTerms ? colors.accent : colors.textSecondary}
                                />
                                <View style={styles.termsTextContainer}>
                                    <Text style={[styles.termsText, { color: colors.text }]}>
                                        (필수)
                                        <Text
                                            style={[styles.linkText, { color: colors.accent }]}
                                            onPress={handleLinkPress}
                                        > 이용 약관 및 개인정보 처리 방침</Text>
                                        에 동의합니다.
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
                                onPress={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>가입하기</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
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
        height: '90%',
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
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
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        fontSize: 14,
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    genderButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    genderText: {
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    termsTextContainer: {
        marginLeft: 8,
        flex: 1,
    },
    termsText: {
        fontSize: 13,
    },
    linkText: {
        textDecorationLine: 'underline',
        fontWeight: 'bold',
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
