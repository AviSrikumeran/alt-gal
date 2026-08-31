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
/** "'Inter', system-ui, sans-serif" (D-066). Unknown family → quoted name + sans fallback. */
export function fontStack(family: string): string {
  const entry = FONT_CATALOG.find((f) => f.family === family);
  return `'${family}', ${entry?.fallback ?? 'system-ui, sans-serif'}`;
}
