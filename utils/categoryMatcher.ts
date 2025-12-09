// Category matching utility for auto-categorization
import { Category, DEFAULT_CATEGORIES } from '@/constants/types';

/**
 * Suggests a category based on the OG title and URL
 * @param ogTitle - The OG title of the link
 * @param url - The URL of the link
 * @param categories - Available categories
 * @returns Suggested category ID or 'articles' as default
 */
export function suggestCategory(
    ogTitle: string,
    url: string,
    categories: Category[] = DEFAULT_CATEGORIES
): string {
    const searchText = `${ogTitle} ${url}`.toLowerCase();

    // Check each category's keywords (skip favorites)
    for (const category of categories) {
        if (category.id === 'favorites') continue;

        for (const keyword of category.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                return category.id;
            }
        }
    }

    // Default to articles if no match
    return 'articles';
}

/**
 * Get all matching categories for a given text
 * @param ogTitle - The OG title of the link
 * @param url - The URL of the link
 * @param categories - Available categories
 * @returns Array of matching category IDs sorted by relevance
 */
export function getMatchingCategories(
    ogTitle: string,
    url: string,
    categories: Category[] = DEFAULT_CATEGORIES
): string[] {
    const searchText = `${ogTitle} ${url}`.toLowerCase();
    const matches: { id: string; score: number }[] = [];

    for (const category of categories) {
        if (category.id === 'favorites') continue;

        let score = 0;
        for (const keyword of category.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                score++;
            }
        }

        if (score > 0) {
            matches.push({ id: category.id, score });
        }
    }

    // Sort by score descending and return IDs
    return matches
        .sort((a, b) => b.score - a.score)
        .map((m) => m.id);
}
