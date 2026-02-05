/**
 * Color palette for Meal Planning App
 * Matches the web app's coral/orange theme
 */

export const colors = {
  // Primary - Coral/Orange
  primary: '#FF6B4A',
  primaryLight: '#FFF0ED',
  primaryDark: '#E5573A',

  // Accent - Salmon
  accent: '#FF8A7A',
  accentLight: '#FFE8E5',

  // Background
  background: '#FFFAF7',
  card: '#FFFFFF',
  surface: '#FFF8F5',

  // Text
  text: '#3D2C29',
  textSecondary: '#8B7355',
  textMuted: '#A69080',
  textLight: '#FFFFFF',

  // Border
  border: '#F5E6E0',
  borderLight: '#FAF0EC',

  // Meal Types
  meal: {
    breakfast: {
      bg: '#FEF3C7',
      text: '#92400E',
      border: '#FCD34D',
    },
    lunch: {
      bg: '#FFEDD5',
      text: '#C2410C',
      border: '#FB923C',
    },
    dinner: {
      bg: '#FFE4E6',
      text: '#BE123C',
      border: '#FDA4AF',
    },
    snack: {
      bg: '#FCE7F3',
      text: '#BE185D',
      border: '#F9A8D4',
    },
  },

  // Category Colors
  category: {
    breakfast: { bg: '#FEF3C7', text: '#92400E' },
    lunch: { bg: '#FFEDD5', text: '#C2410C' },
    dinner: { bg: '#FFE4E6', text: '#BE123C' },
    snack: { bg: '#FCE7F3', text: '#BE185D' },
    dessert: { bg: '#F3E8FF', text: '#7C3AED' },
    appetizer: { bg: '#FEF9C3', text: '#A16207' },
    side: { bg: '#D1FAE5', text: '#065F46' },
    drink: { bg: '#E0F2FE', text: '#0369A1' },
  },

  // Difficulty Colors
  difficulty: {
    easy: { bg: '#D1FAE5', text: '#065F46' },
    medium: { bg: '#FEF3C7', text: '#92400E' },
    hard: { bg: '#FEE2E2', text: '#991B1B' },
  },

  // Status Colors
  success: '#22C55E',
  successLight: '#DCFCE7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Grayscale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorKey = keyof typeof colors;
