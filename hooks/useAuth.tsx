// Auth Context - Supabase authentication with Kakao OAuth
import { supabase } from '@/utils/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

// Required for web browser to close properly on iOS
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signInWithKakao: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Handle deep link for OAuth callback (for development builds)
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const handleDeepLink = async (event: { url: string }) => {
            const url = event.url;
            console.log('🔗 DeepLink received:', url);

            // Check if this is an auth callback with tokens
            if (url.includes('access_token') || url.includes('#access_token')) {
                try {
                    // Parse tokens from URL
                    const hashPart = url.split('#')[1] || url.split('?')[1] || '';
                    const params = new URLSearchParams(hashPart);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken) {
                        console.log('🔑 Setting session from deep link');
                        const { data: sessionData, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                        if (!error && sessionData.session) {
                            setSession(sessionData.session);
                            setUser(sessionData.session.user);
                            console.log('🎉 Login successful via deep link!');
                        }
                    }
                } catch (error) {
                    console.error('Error handling deep link:', error);
                }
            }
        };

        // Get the initial URL if the app was opened from a link
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        // Listen for incoming links while the app is open
        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => subscription.remove();
    }, []);

    const signInWithKakao = async () => {
        try {
            if (Platform.OS === 'web') {
                // Web: Use standard OAuth redirect
                const origin = window.location.origin;
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'kakao',
                    options: {
                        redirectTo: origin,
                        scopes: 'profile_nickname profile_image account_email',
                    },
                });
                if (error) throw error;
            } else {
                // Native (Development Build): Use custom URL scheme
                // This will work with linker://auth/callback
                const redirectUrl = 'linker://auth/callback';
                console.log('🔗 OAuth Redirect URL:', redirectUrl);

                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'kakao',
                    options: {
                        redirectTo: redirectUrl,
                        skipBrowserRedirect: true,
                        scopes: 'profile_nickname profile_image account_email',
                    },
                });

                if (error) throw error;
                if (!data.url) throw new Error('No auth URL returned');

                console.log('🌐 Opening OAuth URL');

                // Open browser for OAuth
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUrl
                );

                console.log('📱 Auth result:', result.type);

                if (result.type === 'success' && result.url) {
                    console.log('✅ Callback URL:', result.url);

                    // Parse tokens from URL
                    const hashPart = result.url.split('#')[1] || result.url.split('?')[1] || '';
                    const params = new URLSearchParams(hashPart);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken) {
                        console.log('🔑 Setting session with access token');
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                        if (sessionError) throw sessionError;
                        if (sessionData.session) {
                            setSession(sessionData.session);
                            setUser(sessionData.session.user);
                            console.log('🎉 Login successful!');
                        }
                    } else {
                        // Try refreshing session as fallback
                        const { data: refreshData } = await supabase.auth.getSession();
                        if (refreshData.session) {
                            setSession(refreshData.session);
                            setUser(refreshData.session.user);
                        }
                    }
                } else if (result.type === 'cancel' || result.type === 'dismiss') {
                    console.log('❌ Auth cancelled by user');
                }
            }
        } catch (error) {
            console.error('Sign in error:', error);
            Alert.alert('로그인 오류', '로그인 중 오류가 발생했습니다.');
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                isLoading,
                signInWithKakao,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
