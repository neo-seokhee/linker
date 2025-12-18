// Explore data caching utility
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'explore_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
    feedData: any[];
    top10Data: any[];
    featuredData: any[];
    timestamp: number;
}

export async function getCachedExploreData(): Promise<CachedData | null> {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const data: CachedData = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - data.timestamp < CACHE_DURATION) {
            return data;
        }

        // Cache expired
        return null;
    } catch (error) {
        console.log('Error reading cache:', error);
        return null;
    }
}

export async function setCachedExploreData(
    feedData: any[],
    top10Data: any[],
    featuredData: any[]
): Promise<void> {
    try {
        const data: CachedData = {
            feedData,
            top10Data,
            featuredData,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.log('Error saving cache:', error);
    }
}

export async function clearExploreCache(): Promise<void> {
    try {
        await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.log('Error clearing cache:', error);
    }
}
