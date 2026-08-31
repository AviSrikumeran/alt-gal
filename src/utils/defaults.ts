import type { TokenState } from '@/types/tokens';

export const SPACING_SCALE: readonly number[] = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]; // D-082

export const DEFAULT_TOKENS: TokenState = {
  colors: {
    primary: null,
    secondary: null,
    accent: null,
    danger: null,
    warning: null,
    success: null,
    muted: null,
    background: null,
    surface: null,
    'text-primary': null,
    'text-secondary': null,
    'text-muted': null,
    border: null,
  },
  dark: null,
  typography: {
    families: { heading: 'Inter', body: 'Inter', mono: 'JetBrains Mono' },
    scale: { xs: 12, sm: 14, base: 16, md: 18, lg: 20, xl: 24, '2xl': 30, '3xl': 36, '4xl': 48 },
    weights: { light: 300, regular: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeights: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
  },
  spacing: { unit: 4, scale: SPACING_SCALE },
  radius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  elevation: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  },
  animation: {
    durationFast: 150,
    durationNormal: 250,
    durationSlow: 400,
    easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easingOut: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  touched: [],
  locked: [],
};

/** Phase-2 gate colors (D-048). */
export const REQUIRED_COLORS_FOR_COMPONENTS = ['color.primary', 'color.background', 'color.text-primary'] as const;
export const TOKENS_REQUIRED_FOR_PHASE_2 = 5;
export const COMPONENTS_REQUIRED_FOR_PHASE_3 = 2;
