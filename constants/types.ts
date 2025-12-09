// Types for Linker App

export interface Link {
    id: string;
    url: string;
    ogTitle: string;
    customTitle?: string; // User-editable title override
    ogImage: string;
    ogDescription?: string;
    categoryId: string;
    createdAt: string;
    isFavorite: boolean;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    keywords: string[]; // For auto-categorization
}

export interface User {
    id: string;
    email: string;
    name: string;
}

// Default categories
export const DEFAULT_CATEGORIES: Category[] = [
    {
        id: 'favorites',
        name: '즐겨찾기',
        icon: '⭐',
        keywords: [],
    },
    {
        id: 'news',
        name: '뉴스',
        icon: '📰',
        keywords: ['news', '뉴스', '속보', '기사', 'breaking', 'headline', '연합', 'yonhap', 'reuters'],
    },
    {
        id: 'shopping',
        name: '쇼핑',
        icon: '🛒',
        keywords: ['shop', '쇼핑', '구매', 'buy', 'store', '마켓', 'market', 'sale', '할인', 'coupang', '쿠팡', '11번가'],
    },
    {
        id: 'articles',
        name: '읽어볼 글',
        icon: '📖',
        keywords: ['blog', '블로그', 'article', 'post', 'medium', 'velog', 'tistory', 'brunch'],
    },
];

// App State
export interface AppState {
    links: Link[];
    categories: Category[];
    user: User | null;
    isLoading: boolean;
}
