export type FontCategory = 'sans' | 'serif' | 'mono';
export interface FontEntry {
  family: string;
  category: FontCategory;
  fallback: string;
  weights: number[];
}

export const FONT_CATALOG: readonly FontEntry[] = [
  { family: 'Inter', category: 'sans', fallback: 'system-ui, sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Geist', category: 'sans', fallback: 'system-ui, sans-serif', weights: [400, 500, 600, 700] },
  { family: 'DM Sans', category: 'sans', fallback: 'system-ui, sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Plus Jakarta Sans', category: 'sans', fallback: 'system-ui, sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Manrope', category: 'sans', fallback: 'system-ui, sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Space Grotesk', category: 'sans', fallback: 'system-ui, sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Playfair Display', category: 'serif', fallback: 'Georgia, serif', weights: [400, 600, 700] },
  { family: 'Lora', category: 'serif', fallback: 'Georgia, serif', weights: [400, 600, 700] },
  { family: 'Fraunces', category: 'serif', fallback: 'Georgia, serif', weights: [400, 600, 700] },
  { family: 'Source Serif 4', category: 'serif', fallback: 'Georgia, serif', weights: [400, 600, 700] },
  {
    family: 'JetBrains Mono',
    category: 'mono',
    fallback: 'ui-monospace, SFMono-Regular, monospace',
    weights: [400, 700],
  },
  { family: 'Geist Mono', category: 'mono', fallback: 'ui-monospace, SFMono-Regular, monospace', weights: [400, 700] },
  {
    family: 'IBM Plex Mono',
    category: 'mono',
    fallback: 'ui-monospace, SFMono-Regular, monospace',
    weights: [400, 700],
  },
] as const;

export const FONT_FAMILIES = FONT_CATALOG.map((f) => f.family);
export const FONT_GROUPS: Record<FontCategory, FontEntry[]> = {
  sans: FONT_CATALOG.filter((f) => f.category === 'sans'),
  serif: FONT_CATALOG.filter((f) => f.category === 'serif'),
  mono: FONT_CATALOG.filter((f) => f.category === 'mono'),
};
export const FONT_CATEGORY_LABEL: Record<FontCategory, string> = { sans: 'Sans', serif: 'Serif', mono: 'Mono' };

export const fontEntry = (family: string): FontEntry | undefined => FONT_CATALOG.find((f) => f.family === family);
const fallbackFor = (family: string): string => fontEntry(family)?.fallback ?? 'system-ui, sans-serif';

/**
 * The CSS custom property next/font writes the loaded face name into (D-119, D-120).
 * 'Geist Mono' -> '--font-geist-mono'. globals.css reads --font-geist / --font-geist-mono directly.
 */
export const fontVar = (family: string): `--${string}` =>
  `--font-${family.toLowerCase().replace(/\s+/g, '-')}` as `--${string}`;

/**
 * Canvas stack (D-066, D-120 as amended by D-221). next/font renames families internally
 * ('__Inter_abc123'), so the loaded name is reached through the variable fontLoader.ts declares
 * rather than by importing FONTS here: `utils/fonts` is imported by tokenToCss, the stores, and
 * every test, and `next/font/google` only resolves inside the Next compiler.
 * Unknown family -> quoted name + fallback.
 */
export function fontStack(family: string): string {
  if (!fontEntry(family)) return `'${family}', system-ui, sans-serif`;
  return `var(${fontVar(family)}), ${fallbackFor(family)}`;
}

/** Export stack (D-121): the public Google Fonts name, for code that has no next/font. */
export function publicFontStack(family: string): string {
  return `'${family}', ${fallbackFor(family)}`;
}
