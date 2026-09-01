import type { SemanticColorRole } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';

export interface HSL {
  h: number;
  s: number;
  l: number;
} // h 0–359, s/l 0–100
export interface RGB {
  r: number;
  g: number;
  b: number;
} // 0–255
export type PaletteStrategy = 'complementary' | 'analogous' | 'triadic' | 'monochromatic';
export const PALETTE_STRATEGIES: readonly PaletteStrategy[] = [
  'complementary',
  'analogous',
  'triadic',
  'monochromatic',
] as const;

const HSL_RE = /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;
const RGB_RE = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const norm360 = (h: number): number => ((h % 360) + 360) % 360;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
/** Alpha is not a token property: anything but a fully opaque color is rejected (D-161). */
const opaque = (alpha: string | undefined): boolean =>
  alpha === undefined || alpha === '100%' || parseFloat(alpha) === 1;

/** Accepts hsl() (comma or space syntax), #rgb/#rrggbb, rgb(). Returns null if unparseable. */
export function parseColor(input: string): HSL | null {
  const s = input.trim();
  let m = HSL_RE.exec(s);
  if (m) {
    if (!opaque(m[4])) return null;
    return { h: norm360(Number(m[1])), s: clamp(Number(m[2]), 0, 100), l: clamp(Number(m[3]), 0, 100) };
  }
  m = RGB_RE.exec(s);
  if (m) {
    if (!opaque(m[4])) return null;
    return rgbToHsl({
      r: clamp(Number(m[1]), 0, 255),
      g: clamp(Number(m[2]), 0, 255),
      b: clamp(Number(m[3]), 0, 255),
    });
  }
  m = HEX_RE.exec(s);
  if (m) {
    const raw = m[1] as string;
    const h =
      raw.length === 3
        ? raw
            .split('')
            .map((c) => c + c)
            .join('')
        : raw;
    return rgbToHsl({
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    });
  }
  return null;
}
/** Normalized store format: 'hsl(250, 84.0%, 60.0%)' → integer h, one-decimal s/l (D-080). */
export function toHSLString(c: HSL): string {
  return `hsl(${Math.round(c.h)}, ${c.s.toFixed(1)}%, ${c.l.toFixed(1)}%)`;
}
export function hslToRgb({ h, s, l }: HSL): RGB {
  const S = s / 100;
  const L = l / 100;
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    const a = S * Math.min(L, 1 - L);
    return L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}
export function rgbToHsl({ r, g, b }: RGB): HSL {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h = norm360(h * 60);
  return { h, s: s * 100, l: l * 100 };
}
export function toHex(c: HSL): string {
  const { r, g, b } = hslToRgb(c);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
/** WCAG 2.1 relative luminance, 0–1. */
export function relativeLuminance({ r, g, b }: RGB): number {
  const lin = (c: number): number => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
/** WCAG 2.1 contrast ratio, 1–21. Accepts normalized hsl strings. */
export function contrastRatio(a: string, b: string): number {
  const A = parseColor(a);
  const B = parseColor(b);
  if (!A || !B) return 1;
  const la = relativeLuminance(hslToRgb(A));
  const lb = relativeLuminance(hslToRgb(B));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
/**
 * D-046 candidate pair, D-220 selection rule: pick whichever of the two derived on-colors
 * actually contrasts more against the base instead of switching on HSL lightness. Lightness is
 * not luminance — a green at l=45 or an amber at l=50 is bright, and the lightness rule handed
 * them white text at 2.2:1 and 2.0:1. Never worse than the lightness rule; the candidates are
 * unchanged, so `--color-on-*` values stay in the same family.
 */
export function onColor(base: HSL): string {
  const self = toHSLString(base);
  const dark = toHSLString({ h: base.h, s: 15, l: 10 });
  const light = toHSLString({ h: base.h, s: 10, l: 98 });
  return contrastRatio(dark, self) >= contrastRatio(light, self) ? dark : light;
}

/** Semantic hues are fixed; they shift only when the primary crowds them (D-162). */
const SEMANTIC_FIXED = {
  danger: { h: 0, s: 84, l: 60 },
  warning: { h: 38, s: 92, l: 50 },
  success: { h: 142, s: 71, l: 45 },
} as const;
const SHIFTS: Record<PaletteStrategy, readonly [number, number]> = {
  complementary: [180, 30],
  analogous: [30, -30],
  triadic: [120, 240],
  monochromatic: [0, 0],
};
export const hueDist = (a: number, b: number): number => {
  const d = Math.abs(norm360(a) - norm360(b));
  return Math.min(d, 360 - d);
};

/**
 * D-219 amends D-162: text-muted sits at l=54, not 58. At 58 the pair
 * text-muted/background fails D-163's >=3:1 for green (2.76) and orange (2.92) primaries;
 * 54 clears it for all four test primaries x four strategies. Measured, not estimated.
 */
const TEXT_MUTED_L = 54;

/** Turn 6 §6.1 table. Returns all 13 roles. */
export function generatePalette(primary: HSL, strategy: PaletteStrategy): Record<SemanticColorRole, string> {
  const p = primary;
  const partnerL = clamp(p.l, 40, 65);
  const partnerS = clamp(p.s - 8, 20, 100);
  const shift = SHIFTS[strategy];
  const secondary: HSL =
    strategy === 'monochromatic'
      ? { h: p.h, s: clamp(p.s - 20, 10, 100), l: clamp(p.l + 15, 20, 85) }
      : { h: norm360(p.h + shift[0]), s: partnerS, l: partnerL };
  const accent: HSL =
    strategy === 'monochromatic'
      ? { h: p.h, s: p.s, l: clamp(p.l - 15, 15, 80) }
      : { h: norm360(p.h + shift[1]), s: partnerS, l: partnerL };
  const semantic = (role: keyof typeof SEMANTIC_FIXED): HSL => {
    const base = { ...SEMANTIC_FIXED[role] };
    return hueDist(base.h, p.h) <= 22 ? { h: base.h, s: base.s - 10, l: base.l - 12 } : base;
  };
  const out: Record<SemanticColorRole, HSL> = {
    primary: p,
    secondary,
    accent,
    danger: semantic('danger'),
    warning: semantic('warning'),
    success: semantic('success'),
    muted: { h: p.h, s: 6, l: 90 },
    background: { h: p.h, s: 10, l: 98 },
    surface: { h: p.h, s: 10, l: 100 },
    'text-primary': { h: p.h, s: 15, l: 10 },
    'text-secondary': { h: p.h, s: 10, l: 40 },
    'text-muted': { h: p.h, s: 8, l: TEXT_MUTED_L },
    border: { h: p.h, s: 12, l: 88 },
  };
  const result = {} as Record<SemanticColorRole, string>;
  for (const role of SEMANTIC_COLOR_ROLES) result[role] = toHSLString(out[role]);
  return result;
}

/** Turn 6 §6.1 dark transform. Nulls pass through as null. */
export function deriveDarkTheme(
  light: Record<SemanticColorRole, string | null>,
): Record<SemanticColorRole, string | null> {
  const out = {} as Record<SemanticColorRole, string | null>;
  const brand: SemanticColorRole[] = ['primary', 'secondary', 'accent', 'danger', 'warning', 'success'];
  for (const role of SEMANTIC_COLOR_ROLES) {
    const raw = light[role];
    const c = raw ? parseColor(raw) : null;
    if (!c) {
      out[role] = null;
      continue;
    }
    const d: HSL = { ...c };
    switch (role) {
      case 'background':
        d.s = clamp(c.s, 0, 20);
        d.l = 8;
        break;
      case 'surface':
        d.s = clamp(c.s, 0, 20);
        d.l = 12;
        break;
      case 'muted':
        d.s = clamp(c.s, 0, 15);
        d.l = 20;
        break;
      case 'border':
        d.s = clamp(c.s, 0, 15);
        d.l = 22;
        break;
      case 'text-primary':
        d.l = 95;
        break;
      case 'text-secondary':
        d.l = 70;
        break;
      case 'text-muted':
        d.l = 52;
        break;
      default:
        // brand + semantic
        d.l = clamp(c.l + 8, 0, 100);
        d.s = clamp(c.s - 5, 0, 100);
    }
    out[role] = toHSLString(d);
  }
  // Contrast repair: walk brand colors lighter in 2% steps until on-color >= 4.5 and brand-on-background >= 3.
  const background = out.background;
  for (const role of brand) {
    const start = out[role];
    if (!start || !background) continue;
    let c = parseColor(start);
    if (!c) continue;
    let guard = 0;
    while (
      guard++ < 20 &&
      (contrastRatio(onColor(c), toHSLString(c)) < 4.5 || contrastRatio(toHSLString(c), background) < 3)
    ) {
      c = { ...c, l: clamp(c.l + 2, 0, 100) };
    }
    out[role] = toHSLString(c);
  }
  return out;
}

/** '350-10' → true for h ∈ [350,360) ∪ [0,10]. '20-60' → [20,60]. Inclusive both ends. */
export function hueInRange(h: number, range: string): boolean {
  const m = /^\s*(\d{1,3})\s*-\s*(\d{1,3})\s*$/.exec(range);
  if (!m) return false;
  const a = norm360(Number(m[1]));
  const b = norm360(Number(m[2]));
  const x = norm360(h);
  return a <= b ? x >= a && x <= b : x >= a || x <= b;
}
