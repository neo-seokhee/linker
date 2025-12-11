// useProfile Hook - Manage user profile and nickname
import { supabase } from '@/utils/supabaseClient';
import { useCallback, useEffect, useState } from 'react';

export interface Profile {
    id: string;
    nickname: string;
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
}

interface UseProfileReturn {
    profile: Profile | null;
    isLoading: boolean;
    updateNickname: (nickname: string) => Promise<boolean>;
    updateProfile: (updates: { nickname?: string; avatarUrl?: string }) => Promise<boolean>;
    refreshProfile: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Get current user's profile
    const getProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.log('Profile not found, creating one...');
            // Profile might not exist, try to create it
            await ensureProfile(user.id, user.email);
            return;
        }

        if (data) {
            setProfile({
                id: data.id,
                nickname: data.nickname,
                avatarUrl: data.avatar_url,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            });
        }
        setIsLoading(false);
    }, []);

    // Ensure profile exists, create if not
    const ensureProfile = async (userId: string, email?: string | null) => {
        // Generate a default nickname
        const emailPrefix = email ? email.split('@')[0] : 'user';
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const defaultNickname = `${emailPrefix}_${randomSuffix}`;

        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                nickname: defaultNickname,
            }, { onConflict: 'id' })
            .select()
            .single();

        if (!error && data) {
            setProfile({
                id: data.id,
                nickname: data.nickname,
                avatarUrl: data.avatar_url,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            });
        }
        setIsLoading(false);
    };

    // Update nickname
    const updateNickname = async (nickname: string): Promise<boolean> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('profiles')
            .update({
                nickname,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating nickname:', error);
            return false;
        }

        setProfile(prev => prev ? { ...prev, nickname } : null);
        return true;
    };

    // Update profile (nickname and/or avatar)
    const updateProfile = async (updates: { nickname?: string; avatarUrl?: string }): Promise<boolean> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const dbUpdates: Record<string, any> = {
            updated_at: new Date().toISOString()
        };

        if (updates.nickname) dbUpdates.nickname = updates.nickname;
        if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
            return false;
        }

        setProfile(prev => prev ? {
            ...prev,
            ...(updates.nickname && { nickname: updates.nickname }),
            ...(updates.avatarUrl !== undefined && { avatarUrl: updates.avatarUrl })
        } : null);
        return true;
    };

    // Refresh profile
    const refreshProfile = useCallback(async () => {
        setIsLoading(true);
        await getProfile();
    }, [getProfile]);

    // Initial load
    useEffect(() => {
        getProfile();
    }, [getProfile]);

    // Listen for auth changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            getProfile();
        });

        return () => subscription.unsubscribe();
    }, [getProfile]);

    return {
        profile,
        isLoading,
        updateNickname,
        updateProfile,
        refreshProfile,
    };
}

// Helper function to get nickname by user ID (for use in explore)
export async function getNicknameByUserId(userId: string): Promise<string> {
    const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', userId)
        .single();

    if (error || !data) {
        return 'user';
    }

    return data.nickname;
}

// Batch get nicknames for multiple user IDs
export async function getNicknamesByUserIds(userIds: string[]): Promise<Record<string, string>> {
    if (userIds.length === 0) return {};

    const uniqueIds = Array.from(new Set(userIds));

    const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', uniqueIds);

    if (error || !data) {
        return {};
    }

    const nicknameMap: Record<string, string> = {};
    data.forEach(profile => {
        nicknameMap[profile.id] = profile.nickname;
    });

    return nicknameMap;
}
