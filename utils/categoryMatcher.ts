// Category matching utility for auto-categorization
import { Category, DEFAULT_CATEGORIES } from '@/constants/types';

// Category UUIDs (must match database)
const CATEGORY_FAVORITES = '00000000-0000-0000-0000-000000000001';
const CATEGORY_ARTICLES = '00000000-0000-0000-0000-000000000004';
const CATEGORY_UNCATEGORIZED = '00000000-0000-0000-0000-000000000005';

/**
 * Suggests a category based on the OG title and URL
 * @param ogTitle - The OG title of the link
 * @param url - The URL of the link
 * @param categories - Available categories
 * @returns Suggested category ID (UUID) or uncategorized as default
 */
export function suggestCategory(
    ogTitle: string,
    url: string,
    categories: Category[] = DEFAULT_CATEGORIES
): string {
    const searchText = `${ogTitle} ${url}`.toLowerCase();

    // Check each category's keywords (skip favorites and uncategorized)
    for (const category of categories) {
        if (category.id === CATEGORY_FAVORITES || category.id === CATEGORY_UNCATEGORIZED) continue;

        for (const keyword of category.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                return category.id;
            }
        }
    }

    // Default to uncategorized if no match (empty string triggers uncategorized in addLink)
    return '';
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
        // Skip favorites and uncategorized
        if (category.id === CATEGORY_FAVORITES || category.id === CATEGORY_UNCATEGORIZED) continue;

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
