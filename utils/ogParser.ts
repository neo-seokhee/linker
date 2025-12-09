// OG Parser utility - fetches OG metadata with special YouTube handling
// In production, this would need a backend proxy due to CORS

export interface OGData {
    title: string;
    image: string;
    description?: string;
    url: string;
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Fetch YouTube video data using oEmbed API
 */
async function fetchYouTubeData(videoId: string): Promise<OGData | null> {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const response = await fetch(oembedUrl);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        return {
            title: data.title || 'YouTube Video',
            // YouTube thumbnails: maxresdefault > sddefault > hqdefault > mqdefault > default
            image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            description: data.author_name ? `by ${data.author_name}` : undefined,
            url: `https://www.youtube.com/watch?v=${videoId}`,
        };
    } catch (error) {
        console.error('Failed to fetch YouTube data:', error);
        return null;
    }
}

/**
 * Check if URL is a YouTube link
 */
function isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Simulates fetching OG metadata from a URL
 * Special handling for YouTube URLs
 * In production, you would:
 * 1. Call a backend API that fetches the URL
 * 2. Parse the HTML for og:title, og:image, og:description meta tags
 * 3. Return the parsed data
 * 
 * For now, we generate placeholder data based on the URL
 */
export async function fetchOGData(url: string): Promise<OGData> {
    // Special handling for YouTube
    if (isYouTubeUrl(url)) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
            const youtubeData = await fetchYouTubeData(videoId);
            if (youtubeData) {
                return youtubeData;
            }
        }
    }

    // Simulate network delay for other URLs
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Extract domain for display
    let domain = '';
    try {
        const urlObj = new URL(url);
        domain = urlObj.hostname.replace('www.', '');
    } catch {
        domain = url;
    }

    // Generate placeholder data
    return {
        title: domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0],
        image: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
        description: `Link from ${domain}`,
        url: url,
    };
}

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

/**
 * Normalizes a URL by adding https:// if missing
 */
export function normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
    }
    return url;
}
