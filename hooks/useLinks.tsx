// Links Context - State management for links with Supabase (with user authentication)
import { Category, DEFAULT_CATEGORIES, Link } from '@/constants/types';
import { DbCategory, DbLink, supabase } from '@/utils/supabaseClient';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

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

// Category UUIDs
const CATEGORY_FAVORITES = '00000000-0000-0000-0000-000000000001';
const CATEGORY_ARTICLES = '00000000-0000-0000-0000-000000000004';
const CATEGORY_UNCATEGORIZED = '00000000-0000-0000-0000-000000000005';

// Helper: Convert DB category to app category
const dbCategoryToCategory = (dbCat: DbCategory): Category => ({
    id: dbCat.id,
    name: dbCat.name,
    icon: dbCat.icon,
    keywords: dbCat.keywords || [],
});

// Helper: Convert DB link to app link
const dbLinkToLink = (dbLink: DbLink): Link => ({
    id: dbLink.id,
    url: dbLink.url,
    ogTitle: dbLink.og_title,
    customTitle: dbLink.custom_title || undefined,
    ogImage: dbLink.og_image || '',
    ogDescription: dbLink.og_description || undefined,
    categoryId: dbLink.category_id,
    createdAt: dbLink.created_at,
    isFavorite: dbLink.is_favorite,
    isPublic: dbLink.is_public ?? true,
});

// Sample links for first-time users
const SAMPLE_LINKS = [
    {
        url: 'https://www.notion.so',
        og_title: 'Notion - The all-in-one workspace',
        og_image: 'https://www.notion.so/images/meta/default.png',
        og_description: '팀 협업을 위한 올인원 워크스페이스',
        category_id: CATEGORY_ARTICLES,
        is_favorite: true,
        is_public: true,
    },
    {
        url: 'https://github.com',
        og_title: 'GitHub - Build from here',
        og_image: 'https://github.githubassets.com/images/modules/site/social-cards/github-social.png',
        og_description: '개발자를 위한 코드 호스팅 플랫폼',
        category_id: CATEGORY_ARTICLES,
        is_favorite: false,
    },
    {
        url: 'https://www.youtube.com',
        og_title: 'YouTube',
        og_image: 'https://www.youtube.com/img/desktop/yt_1200.png',
        og_description: '세상의 모든 영상을 감상하세요',
        category_id: CATEGORY_ARTICLES,
        is_favorite: false,
    },
];

export function LinksProvider({ children }: { children: ReactNode }) {
    const [links, setLinks] = useState<Link[]>([]);
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [isLoading, setIsLoading] = useState(true);

    // Load data from Supabase on mount
    useEffect(() => {
        loadData();

        // Also reload when auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadData();
        });

        return () => subscription.unsubscribe();
    }, []);

    const addSampleLinksForNewUser = async (userId: string) => {
        // Check if sample links were already added (using flag in profiles table)
        const { data: profile } = await supabase
            .from('profiles')
            .select('sample_links_added')
            .eq('id', userId)
            .single();

        // Only add sample links if flag is false or null
        if (profile?.sample_links_added) {
            return; // Sample links already added before
        }

        const linksWithUserId = SAMPLE_LINKS.map(link => ({
            ...link,
            user_id: userId,
        }));

        const { error } = await supabase
            .from('links')
            .insert(linksWithUserId);

        if (error) {
            console.error('Error adding sample links:', error);
            return;
        }

        // Set flag to true so sample links won't be added again
        await supabase
            .from('profiles')
            .update({ sample_links_added: true })
            .eq('id', userId);
    };

    const loadData = async () => {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            // Load categories (default categories + user's custom categories)
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('categories')
                .select('*')
                .order('order_index', { ascending: true });

            if (categoriesError) {
                console.error('Error loading categories:', categoriesError);
                // Fall back to default categories if RLS blocks access
                setCategories(DEFAULT_CATEGORIES);
            } else if (categoriesData && categoriesData.length > 0) {
                setCategories(categoriesData.map(dbCategoryToCategory));
            }

            // Add sample links for first-time users (DISABLED - causing infinite loop)
            // if (user) {
            //     await addSampleLinksForNewUser(user.id);
            // }

            // Load links (RLS will filter by user_id automatically)
            const { data: linksData, error: linksError } = await supabase
                .from('links')
                .select('*')
                .order('created_at', { ascending: false });

            if (linksError) {
                console.error('Error loading links:', linksError);
                setLinks([]);
            } else if (linksData) {
                setLinks(linksData.map(dbLinkToLink));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addLink = async (linkData: Omit<Link, 'id' | 'createdAt'>) => {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No user logged in');
            return;
        }

        // Use uncategorized if no category selected
        const categoryId = linkData.categoryId || CATEGORY_UNCATEGORIZED;

        console.log('Adding link with:', {
            url: linkData.url,
            categoryId: categoryId,
            userId: user.id,
        });

        const { data, error } = await supabase
            .from('links')
            .insert({
                url: linkData.url,
                og_title: linkData.ogTitle,
                custom_title: linkData.customTitle || null,
                og_image: linkData.ogImage,
                og_description: linkData.ogDescription || null,
                category_id: categoryId,
                is_favorite: linkData.isFavorite,
                is_public: linkData.isPublic ?? true, // Default to public
                user_id: user.id,
            })

            .select()
            .single();

        if (error) {
            console.error('Error adding link:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            alert(`링크 저장 실패: ${error.message}`);
            return;
        }

        console.log('Link added successfully:', data);

        if (data) {
            const newLink = dbLinkToLink(data);
            setLinks(prev => [newLink, ...prev]);
        }

    };

    const updateLink = async (id: string, updates: Partial<Omit<Link, 'id' | 'createdAt'>>) => {
        const dbUpdates: Partial<DbLink> = {};
        if (updates.url !== undefined) dbUpdates.url = updates.url;
        if (updates.ogTitle !== undefined) dbUpdates.og_title = updates.ogTitle;
        if (updates.customTitle !== undefined) dbUpdates.custom_title = updates.customTitle || null;
        if (updates.ogImage !== undefined) dbUpdates.og_image = updates.ogImage;
        if (updates.ogDescription !== undefined) dbUpdates.og_description = updates.ogDescription || null;
        if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
        if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
        if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;

        const { error } = await supabase
            .from('links')
            .update(dbUpdates)
            .eq('id', id);

        if (error) {
            console.error('Error updating link:', error);
            return;
        }

        setLinks(prev => prev.map(link =>
            link.id === id ? { ...link, ...updates } : link
        ));
    };

    const removeLink = async (id: string) => {
        const { error } = await supabase
            .from('links')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error removing link:', error);
            return;
        }

        setLinks(prev => prev.filter(link => link.id !== id));
    };

    const toggleFavorite = async (id: string) => {
        const link = links.find(l => l.id === id);
        if (!link) return;

        const newFavoriteStatus = !link.isFavorite;

        const { error } = await supabase
            .from('links')
            .update({ is_favorite: newFavoriteStatus })
            .eq('id', id);

        if (error) {
            console.error('Error toggling favorite:', error);
            return;
        }

        setLinks(prev => prev.map(l =>
            l.id === id ? { ...l, isFavorite: newFavoriteStatus } : l
        ));
    };

    const getLinksForCategory = (categoryId: string): Link[] => {
        // Check for favorites category
        if (categoryId === CATEGORY_FAVORITES || categoryId === 'favorites') {
            return links.filter(link => link.isFavorite);
        }
        return links.filter(link => link.categoryId === categoryId);
    };

    const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('No user logged in');
        }

        const maxOrderIndex = Math.max(...categories.map(c => (c as any).order_index || 0), 0);

        const { data, error } = await supabase
            .from('categories')
            .insert({
                name: categoryData.name,
                icon: categoryData.icon,
                keywords: categoryData.keywords,
                is_default: false,
                order_index: maxOrderIndex + 1,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding category:', error);
            throw error;
        }

        const newCategory = dbCategoryToCategory(data);
        setCategories(prev => [...prev, newCategory]);
        return newCategory;
    };

    const deleteCategory = async (id: string) => {
        // Prevent deleting favorites or uncategorized
        if (id === CATEGORY_FAVORITES || id === CATEGORY_UNCATEGORIZED) return;

        // Move links from deleted category to uncategorized
        const { error: updateError } = await supabase
            .from('links')
            .update({ category_id: CATEGORY_UNCATEGORIZED })
            .eq('category_id', id);

        if (updateError) {
            console.error('Error moving links:', updateError);
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting category:', error);
            return;
        }

        setCategories(prev => prev.filter(cat => cat.id !== id));
        setLinks(prev => prev.map(link =>
            link.categoryId === id
                ? { ...link, categoryId: CATEGORY_UNCATEGORIZED }
                : link
        ));
    };

    const reorderCategories = async (newOrder: Category[]) => {
        // Update order_index for each category
        const updates = newOrder.map((cat, index) =>
            supabase
                .from('categories')
                .update({ order_index: index })
                .eq('id', cat.id)
        );

        await Promise.all(updates);
        setCategories(newOrder);
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

// Export constants for use in other components
export { CATEGORY_ARTICLES, CATEGORY_FAVORITES, CATEGORY_UNCATEGORIZED };

