// Linker App Theme - Sophisticated & Natural Color Palette

// Primary accent colors
const accentBlue = '#3B82F6'; // Modern blue
const accentPurple = '#8B5CF6'; // Elegant purple

// System colors (universal)
export const SystemColors = {
  success: '#10B981', // Emerald green
  warning: '#F59E0B', // Amber
  error: '#EF4444', // Red
};

export const Colors = {
  light: {
    // Background - Soft whites
    background: '#FAFAFA',
    card: '#FFFFFF',

    // Text - Natural grays
    text: '#1F2937', // Dark gray
    textSecondary: '#6B7280', // Medium gray

    // Accent - Vibrant but not overwhelming
    accent: accentBlue,
    accentAlt: accentPurple,

    // UI Elements
    border: '#E5E7EB', // Light gray border
    tint: accentBlue,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: accentBlue,
  },
  dark: {
    // Background - True dark with slight warmth
    background: '#0F172A', // Slate 900
    card: '#1E293B', // Slate 800

    // Text - Soft whites for reduced eye strain
    text: '#F1F5F9', // Slate 100
    textSecondary: '#94A3B8', // Slate 400

    // Accent - Brighter for dark backgrounds
    accent: '#60A5FA', // Light blue
    accentAlt: '#A78BFA', // Light purple

    // UI Elements
    border: '#334155', // Slate 700
    tint: '#60A5FA',
    tabIconDefault: '#64748B', // Slate 500
    tabIconSelected: '#60A5FA',
  },
};

export type ColorScheme = 'light' | 'dark';

export default Colors;
