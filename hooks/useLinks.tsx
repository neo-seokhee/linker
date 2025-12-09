// Links Context - State management for links
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, Category, DEFAULT_CATEGORIES } from '@/constants/types';
import { dummyLinks } from '@/data/dummyData';

const STORAGE_KEY = '@linker_links';
const CATEGORIES_KEY = '@linker_categories';

interface LinksContextType {
    links: Link[];
    categories: Category[];
    isLoading: boolean;
    addLink: (link: Omit<Link, 'id' | 'createdAt'>) => Promise<void>;
    updateLink: (id: string, updates: Partial<Omit<Link, 'id' | 'createdAt'>>) => Promise<void>;
    removeLink: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    getLinksForCategory: (categoryId: string) => Link[];
    addCategory: (category: Omit<Category, 'id'>) => Promise<Category>;
    deleteCategory: (id: string) => Promise<void>;
    reorderCategories: (newOrder: Category[]) => Promise<void>;
}

const LinksContext = createContext<LinksContextType | undefined>(undefined);

export function LinksProvider({ children }: { children: ReactNode }) {
    const [links, setLinks] = useState<Link[]>([]);
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [isLoading, setIsLoading] = useState(true);

    // Load data from storage on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [storedLinks, storedCategories] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEY),
                AsyncStorage.getItem(CATEGORIES_KEY),
            ]);

            if (storedLinks) {
                setLinks(JSON.parse(storedLinks));
            } else {
                // Use dummy data for demo
                setLinks(dummyLinks);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dummyLinks));
            }

            if (storedCategories) {
                setCategories(JSON.parse(storedCategories));
            }
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to dummy data
            setLinks(dummyLinks);
        } finally {
            setIsLoading(false);
        }
    };

    const saveLinks = async (newLinks: Link[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newLinks));
        } catch (error) {
            console.error('Error saving links:', error);
        }
    };

    const saveCategories = async (newCategories: Category[]) => {
        try {
            await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(newCategories));
        } catch (error) {
            console.error('Error saving categories:', error);
        }
    };

    const addLink = async (linkData: Omit<Link, 'id' | 'createdAt'>) => {
        const newLink: Link = {
            ...linkData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
        };

        const newLinks = [newLink, ...links];
        setLinks(newLinks);
        await saveLinks(newLinks);
    };

    const updateLink = async (id: string, updates: Partial<Omit<Link, 'id' | 'createdAt'>>) => {
        const newLinks = links.map(link =>
            link.id === id ? { ...link, ...updates } : link
        );
        setLinks(newLinks);
        await saveLinks(newLinks);
    };

    const removeLink = async (id: string) => {
        const newLinks = links.filter((link) => link.id !== id);
        setLinks(newLinks);
        await saveLinks(newLinks);
    };

    const toggleFavorite = async (id: string) => {
        const newLinks = links.map((link) =>
            link.id === id ? { ...link, isFavorite: !link.isFavorite } : link
        );

        setLinks(newLinks);
        await saveLinks(newLinks);
    };

    const getLinksForCategory = (categoryId: string): Link[] => {
        if (categoryId === 'favorites') {
            return links.filter((link) => link.isFavorite);
        }
        return links.filter((link) => link.categoryId === categoryId);
    };

    const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
        const newCategory: Category = {
            ...categoryData,
            id: Date.now().toString(),
        };

        const newCategories = [...categories, newCategory];
        setCategories(newCategories);
        await saveCategories(newCategories);
        return newCategory;
    };

    const deleteCategory = async (id: string) => {
        // Prevent deleting favorites category
        if (id === 'favorites') return;

        const newCategories = categories.filter(cat => cat.id !== id);
        setCategories(newCategories);
        await saveCategories(newCategories);

        // Move links from deleted category to 'articles' (default)
        const affectedLinks = links.filter(link => link.categoryId === id);
        if (affectedLinks.length > 0) {
            const updatedLinks = links.map(link =>
                link.categoryId === id ? { ...link, categoryId: 'articles' } : link
            );
            setLinks(updatedLinks);
            await saveLinks(updatedLinks);
        }
    };

    const reorderCategories = async (newOrder: Category[]) => {
        setCategories(newOrder);
        await saveCategories(newOrder);
    };

    return (
        <LinksContext.Provider
            value={{
                links,
                categories,
                isLoading,
                addLink,
                updateLink,
                removeLink,
                toggleFavorite,
                getLinksForCategory,
                addCategory,
                deleteCategory,
                reorderCategories,
            }}
        >
            {children}
        </LinksContext.Provider>
    );
}

export function useLinks() {
    const context = useContext(LinksContext);
    if (context === undefined) {
        throw new Error('useLinks must be used within a LinksProvider');
    }
    return context;
}

