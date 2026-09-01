import type { SemanticColorRole } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import { contrastRatio, deriveDarkTheme, onColor, parseColor } from '@/utils/colorUtils';
import { useTokenStore } from '@/stores/tokenStore';

export type DarkColors = Record<SemanticColorRole, string | null>;

export interface DarkThemeResult {
  dark: DarkColors;
  /** What `tokenStore.dark` held before, for the `restore_dark` inverse (D-061, D-183). */
  previous: DarkColors | null;
  /** Roles the derivation produced a value for. */
  derived: SemanticColorRole[];
  /** Roles skipped because the light value is unset — dark can't invent a color the human never picked. */
  skipped: SemanticColorRole[];
  /** Brand roles the contrast-repair loop had to lighten (D-164). */
  repaired: SemanticColorRole[];
}

const BRAND: readonly SemanticColorRole[] = ['primary', 'secondary', 'accent', 'danger', 'warning', 'success'];

/** Pure: the dark set the current light tokens imply. Does not touch the store. */
export function deriveDarkFromTokens(): DarkColors {
  return deriveDarkTheme(useTokenStore.getState().colors);
}

/** Derives the dark set and writes it to `tokenStore.dark` (D-057). The active theme is uiStore's business. */
export function applyDarkTheme(): DarkThemeResult {
  const state = useTokenStore.getState();
  const light = state.colors;
  const previous = state.dark;
  const dark = deriveDarkTheme(light);

  const derived: SemanticColorRole[] = [];
  const skipped: SemanticColorRole[] = [];
  const repaired: SemanticColorRole[] = [];
  for (const role of SEMANTIC_COLOR_ROLES) {
    if (dark[role] === null) skipped.push(role);
    else derived.push(role);
  }
  // The repair loop only ever lightens, so a brand role whose lightness moved was repaired.
  for (const role of BRAND) {
    const before = light[role] ? parseColor(light[role]) : null;
    const after = dark[role] ? parseColor(dark[role]) : null;
    if (before && after && Math.round(after.l) !== Math.round(Math.min(100, before.l + 8))) repaired.push(role);
  }

  useTokenStore.getState().setDark(dark);
  return { dark, previous, derived, skipped, repaired };
}

/** Undo and "delete dark theme" both land here. */
export function setDarkTheme(dark: DarkColors | null): void {
  useTokenStore.getState().setDark(dark);
}

export const hasDarkTheme = (): boolean => useTokenStore.getState().dark !== null;

/** Contrast facts about a dark set, for the tool envelope and the audit. */
export function darkThemeReport(dark: DarkColors): { role: SemanticColorRole; onContrast: number; bg: number }[] {
  const background = dark.background;
  const out: { role: SemanticColorRole; onContrast: number; bg: number }[] = [];
  for (const role of BRAND) {
    const value = dark[role];
    if (!value || !background) continue;
    const c = parseColor(value);
    if (!c) continue;
    out.push({ role, onContrast: contrastRatio(onColor(c), value), bg: contrastRatio(value, background) });
  }
  return out;
}
