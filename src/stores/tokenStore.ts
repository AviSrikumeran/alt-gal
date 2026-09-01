import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AnimationKey,
  ElevationKey,
  FontFamilyKey,
  FontWeightKey,
  LineHeightKey,
  RadiusKey,
  SemanticColorRole,
  TokenMap,
  TokenPath,
  TokenState,
  TypeScaleKey,
} from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES, TOKEN_PATHS } from '@/types/tokens';
import { DEFAULT_TOKENS, REQUIRED_COLORS_FOR_COMPONENTS } from '@/utils/defaults';
import { FONT_FAMILIES } from '@/utils/fonts';
import { parseColor, toHSLString } from '@/utils/colorUtils';

/** Owns every design token, the derived dark set, locks, and the "touched" list that drives phase counting. */
export interface TokenActions {
  /** Normalizes colors via parseColor/toHSLString; numbers for px/ms groups; rejects invalid with false. */
  setToken(path: TokenPath, value: string): boolean;
  /** Colors → null; other groups → default value and removed from touched. */
  removeToken(path: TokenPath): void;
  setMany(values: Partial<Record<TokenPath, string>>): void;
  setLocked(path: TokenPath, locked: boolean): void;
  setDark(dark: Record<SemanticColorRole, string | null> | null): void;
  reset(): void;
  // reads
  getToken(path: TokenPath): string | null;
  getTokenMap(): TokenMap;
  getDefinedTokenCount(): number; // D-047
  getMissingForPhase2(): string[]; // D-048; [] when satisfied
  isLocked(path: TokenPath): boolean;
}
export type TokenStore = TokenState & TokenActions;

// ---------------------------------------------------------------- reads

const splitPath = (path: TokenPath): [string, string] => path.split('.') as [string, string];

/** Values are the same strings `set_token` accepts: colors normalized, everything else unitless. */
export function readToken(s: TokenState, path: TokenPath): string | null {
  const [group, key] = splitPath(path);
  switch (group) {
    case 'color':
      return s.colors[key as SemanticColorRole] ?? null;
    case 'font':
      return s.typography.families[key as FontFamilyKey];
    case 'fontSize':
      return String(s.typography.scale[key as TypeScaleKey]);
    case 'fontWeight':
      return String(s.typography.weights[key as FontWeightKey]);
    case 'lineHeight':
      return String(s.typography.lineHeights[key as LineHeightKey]);
    case 'spacing':
      // 'unit' is stored; every step is derived (D-082, D-213).
      return key === 'unit' ? String(s.spacing.unit) : String(Number(key) * s.spacing.unit);
    case 'radius':
      return String(s.radius[key as RadiusKey]);
    case 'elevation':
      return s.elevation[key as ElevationKey];
    case 'animation':
      return String(s.animation[key as AnimationKey]);
    default:
      return null;
  }
}

// ---------------------------------------------------------------- validation (D-112)

const int = (v: string, lo: number, hi: number): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};
const num = (v: string, lo: number, hi: number): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
};
const ELEVATION_RE = /^[\d.\s,pxrgbahsl()%#-]+$/i;
const EASING_RE = /^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\(\s*[\d.\s,-]+\))$/i;
const SPACING_UNITS = [2, 4, 6, 8];

/**
 * The one place a token value is validated and normalized. Returns the next state, or null when the
 * value is rejected. Locks are deliberately NOT checked here: the store is dumb so undo can restore a
 * locked token (D-112). Tools and the UI enforce locks.
 */
export function applyToken(s: TokenState, path: TokenPath, value: string): TokenState | null {
  const [group, key] = splitPath(path);
  const v = value.trim();
  let next: TokenState;

  switch (group) {
    case 'color': {
      const c = parseColor(v);
      if (!c) return null;
      // D-080: hex/rgb/space-syntax hsl are accepted as input, never stored.
      next = { ...s, colors: { ...s.colors, [key as SemanticColorRole]: toHSLString(c) } };
      break;
    }
    case 'font': {
      if (!FONT_FAMILIES.includes(v)) return null;
      next = { ...s, typography: { ...s.typography, families: { ...s.typography.families, [key]: v } } };
      break;
    }
    case 'fontSize': {
      const n = int(v, 0, 200);
      if (n === null) return null;
      next = { ...s, typography: { ...s.typography, scale: { ...s.typography.scale, [key]: n } } };
      break;
    }
    case 'fontWeight': {
      const n = int(v, 100, 900);
      if (n === null || n % 100 !== 0) return null;
      next = { ...s, typography: { ...s.typography, weights: { ...s.typography.weights, [key]: n } } };
      break;
    }
    case 'lineHeight': {
      const n = num(v, 0.8, 3);
      if (n === null) return null;
      next = { ...s, typography: { ...s.typography, lineHeights: { ...s.typography.lineHeights, [key]: n } } };
      break;
    }
    case 'spacing': {
      // Only the unit is writable; the ten steps are derived from it (D-082, D-213).
      if (key !== 'unit') return null;
      const n = int(v, 2, 8);
      if (n === null || !SPACING_UNITS.includes(n)) return null;
      next = { ...s, spacing: { ...s.spacing, unit: n } };
      break;
    }
    case 'radius': {
      const n = int(v, 0, 9999);
      if (n === null || (key !== 'full' && n > 200)) return null;
      next = { ...s, radius: { ...s.radius, [key]: n } };
      break;
    }
    case 'elevation': {
      if (v !== 'none' && !ELEVATION_RE.test(v)) return null;
      next = { ...s, elevation: { ...s.elevation, [key]: v } };
      break;
    }
    case 'animation': {
      if (key.startsWith('duration')) {
        const n = int(v, 0, 2000);
        if (n === null) return null;
        next = { ...s, animation: { ...s.animation, [key]: n } };
      } else {
        if (!EASING_RE.test(v)) return null;
        next = { ...s, animation: { ...s.animation, [key]: v } };
      }
      break;
    }
    default:
      return null;
  }

  // D-047: colors are counted directly; every other group counts through `touched`, and a value
  // equal to the default is not a decision the human made.
  if (group !== 'color') {
    const isDefault = readToken(next, path) === readToken(DEFAULT_TOKENS, path);
    const has = next.touched.includes(path);
    if (isDefault && has) next = { ...next, touched: next.touched.filter((p) => p !== path) };
    else if (!isDefault && !has) next = { ...next, touched: [...next.touched, path] };
  }
  return next;
}

/** Colors → null; every other group → its default value, un-touched. */
function clearToken(s: TokenState, path: TokenPath): TokenState {
  const [group, key] = splitPath(path);
  if (group === 'color') return { ...s, colors: { ...s.colors, [key as SemanticColorRole]: null } };
  const fallback = readToken(DEFAULT_TOKENS, path);
  if (fallback === null) return s;
  return applyToken(s, path, fallback) ?? s;
}

// ---------------------------------------------------------------- store

export const useTokenStore = create<TokenStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_TOKENS,
      setToken: (path, value) => {
        const next = applyToken(get(), path, value);
        if (!next) return false;
        set(next);
        return true;
      },
      removeToken: (path) => set(clearToken(get(), path)),
      setMany: (values) => {
        // One `set` for the whole batch: the phase subscriber (D-049) runs once, so "fill from
        // primary" reads as a single 0 → 2 transition rather than thirteen.
        let draft = get() as TokenState;
        for (const [path, value] of Object.entries(values)) {
          if (value === undefined) continue;
          draft = applyToken(draft, path as TokenPath, value) ?? draft;
        }
        set(draft);
      },
      setLocked: (path, locked) =>
        set((s) => ({ locked: locked ? [...new Set([...s.locked, path])] : s.locked.filter((p) => p !== path) })),
      setDark: (dark) => set({ dark }),
      reset: () => set({ ...DEFAULT_TOKENS }),
      getToken: (path) => readToken(get(), path),
      getTokenMap: () => {
        const s = get();
        const out = {} as TokenMap;
        for (const path of TOKEN_PATHS) out[path] = readToken(s, path);
        return out;
      },
      getDefinedTokenCount: () => {
        const s = get();
        return Object.values(s.colors).filter(Boolean).length + s.touched.length;
      },
      getMissingForPhase2: () => {
        const s = get();
        return REQUIRED_COLORS_FOR_COMPONENTS.filter(
          (p) => s.colors[splitPath(p as TokenPath)[1] as SemanticColorRole] === null,
        );
      },
      isLocked: (path) => get().locked.includes(path),
    }),
    {
      name: 'altgal.tokens.v1',
      version: 1,
      partialize: (s) => ({
        colors: s.colors,
        dark: s.dark,
        typography: s.typography,
        spacing: s.spacing,
        radius: s.radius,
        elevation: s.elevation,
        animation: s.animation,
        touched: s.touched,
        locked: s.locked,
      }),
    },
  ),
);

/** Every color role in one call, for "Fill from primary" and suggest_palette. */
export const paletteToValues = (palette: Record<SemanticColorRole, string>): Partial<Record<TokenPath, string>> =>
  Object.fromEntries(SEMANTIC_COLOR_ROLES.map((r) => [`color.${r}`, palette[r]])) as Partial<Record<TokenPath, string>>;
