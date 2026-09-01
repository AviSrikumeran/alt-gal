import { describe, expect, it } from 'vitest';
import type { PaletteStrategy } from '@/utils/colorUtils';
import {
  PALETTE_STRATEGIES,
  contrastRatio,
  deriveDarkTheme,
  generatePalette,
  hslToRgb,
  hueInRange,
  onColor,
  parseColor,
  rgbToHsl,
  toHSLString,
  toHex,
} from '@/utils/colorUtils';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';

/** D-163's four primaries. */
const PRIMARIES = ['hsl(220, 90%, 56%)', 'hsl(142, 71%, 45%)', 'hsl(250, 84%, 60%)', 'hsl(24, 95%, 53%)'];

describe('parseColor (D-161)', () => {
  it('accepts every documented syntax', () => {
    expect(parseColor('hsl(250, 84%, 60%)')).toEqual({ h: 250, s: 84, l: 60 });
    expect(parseColor('hsl(250 84% 60%)')).toEqual({ h: 250, s: 84, l: 60 });
    expect(parseColor('hsl(250deg 84% 60% / 1)')).toEqual({ h: 250, s: 84, l: 60 });
    expect(toHex(parseColor('#7c5cff')!)).toBe('#7c5cff');
    expect(toHex(parseColor('#7cf')!)).toBe('#77ccff');
    expect(parseColor('rgb(124, 92, 255)')).toEqual(parseColor('rgb(124 92 255)'));
  });

  it('rejects alpha, named colors, and oklch', () => {
    expect(parseColor('hsl(250deg 84% 60% / 0.5)')).toBeNull();
    expect(parseColor('rgba(124, 92, 255, 0.2)')).toBeNull();
    expect(parseColor('rebeccapurple')).toBeNull();
    expect(parseColor('oklch(0.7 0.2 250)')).toBeNull();
  });

  it('normalizes hue into [0, 360) and clamps s/l', () => {
    expect(parseColor('hsl(-30, 200%, 60%)')).toEqual({ h: 330, s: 100, l: 60 });
    expect(parseColor('hsl(420, 50%, 60%)')?.h).toBe(60);
  });

  it('round-trips through rgb', () => {
    for (const input of PRIMARIES) {
      const hsl = parseColor(input)!;
      const back = rgbToHsl(hslToRgb(hsl));
      expect(Math.abs(back.h - hsl.h)).toBeLessThan(1);
      expect(Math.abs(back.l - hsl.l)).toBeLessThan(1);
    }
  });
});

describe('contrastRatio (WCAG 2.1)', () => {
  it('matches the reference values', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
    expect(contrastRatio('#767676', '#ffffff')).toBe(4.54);
    expect(contrastRatio('hsl(0, 0%, 50%)', 'hsl(0, 0%, 50%)')).toBe(1);
  });

  it('is symmetric and returns 1 for unparseable input', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBe(contrastRatio('#ffffff', '#767676'));
    expect(contrastRatio('not-a-color', '#ffffff')).toBe(1);
  });
});

describe('onColor (D-046, D-219)', () => {
  it('never picks the worse of the two candidates', () => {
    for (const input of [...PRIMARIES, 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(0, 0%, 100%)']) {
      const base = parseColor(input)!;
      const dark = toHSLString({ h: base.h, s: 15, l: 10 });
      const light = toHSLString({ h: base.h, s: 10, l: 98 });
      const best = Math.max(contrastRatio(dark, input), contrastRatio(light, input));
      expect(contrastRatio(onColor(base), input)).toBe(best);
    }
  });

  it('clears 4.5:1 wherever the candidate pair allows it', () => {
    // hsl(220, 90%, 56%) is excluded deliberately: its ceiling against ANY color is 4.59:1
    // (4.37 with D-046's candidates), so no on-color rule can reach 4.5 for it. The audit
    // reports it instead (D-165 check 2).
    for (const input of ['hsl(142, 71%, 45%)', 'hsl(250, 84%, 60%)', 'hsl(24, 95%, 53%)']) {
      expect(contrastRatio(onColor(parseColor(input)!), input)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(onColor(parseColor('hsl(220, 90%, 56%)')!), 'hsl(220, 90%, 56%)')).toBeGreaterThan(4.3);
  });
});

describe('generatePalette (D-162, D-163)', () => {
  it('returns all thirteen roles as normalized hsl strings', () => {
    const palette = generatePalette(parseColor(PRIMARIES[2]!)!, 'analogous');
    expect(Object.keys(palette).sort()).toEqual([...SEMANTIC_COLOR_ROLES].sort());
    for (const role of SEMANTIC_COLOR_ROLES) expect(palette[role]).toMatch(/^hsl\(\d+, \d+\.\d%, \d+\.\d%\)$/);
  });

  it('holds the four contrast floors for four primaries x four strategies', () => {
    for (const input of PRIMARIES) {
      for (const strategy of PALETTE_STRATEGIES) {
        const p = generatePalette(parseColor(input)!, strategy as PaletteStrategy);
        const where = `${input} / ${strategy}`;
        expect(contrastRatio(p['text-primary'], p.background), where).toBeGreaterThanOrEqual(12);
        expect(contrastRatio(p['text-secondary'], p.surface), where).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(p['text-muted'], p.background), where).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('darkens a semantic role the primary crowds', () => {
    // hsl(24, ...) sits 14 degrees from warning's fixed hue 38, inside the 22-degree window.
    const crowded = generatePalette(parseColor('hsl(24, 95%, 53%)')!, 'analogous');
    expect(parseColor(crowded.warning)!.l).toBeLessThanOrEqual(40);
    const clear = generatePalette(parseColor('hsl(250, 84%, 60%)')!, 'analogous');
    expect(parseColor(clear.warning)!.l).toBe(50);
  });

  it('keeps partner roles usable for extreme primaries', () => {
    for (const extreme of ['hsl(250, 84%, 4%)', 'hsl(250, 84%, 97%)']) {
      const p = generatePalette(parseColor(extreme)!, 'complementary');
      for (const role of ['secondary', 'accent'] as const) {
        const l = parseColor(p[role])!.l;
        expect(l).toBeGreaterThanOrEqual(40);
        expect(l).toBeLessThanOrEqual(65);
      }
    }
  });
});

describe('deriveDarkTheme (D-164)', () => {
  it('passes nulls through', () => {
    const empty = Object.fromEntries(SEMANTIC_COLOR_ROLES.map((r) => [r, null])) as Record<
      (typeof SEMANTIC_COLOR_ROLES)[number],
      string | null
    >;
    expect(Object.values(deriveDarkTheme(empty)).every((v) => v === null)).toBe(true);
  });

  it('holds on-color and background contrast for every brand role', () => {
    for (const input of PRIMARIES) {
      for (const strategy of PALETTE_STRATEGIES) {
        const dark = deriveDarkTheme(generatePalette(parseColor(input)!, strategy as PaletteStrategy));
        const background = dark.background!;
        expect(contrastRatio(dark['text-primary']!, background)).toBeGreaterThanOrEqual(12);
        expect(contrastRatio(dark['text-muted']!, background)).toBeGreaterThanOrEqual(3);
        for (const role of ['primary', 'secondary', 'accent', 'danger', 'warning', 'success'] as const) {
          const value = dark[role]!;
          const where = `${input} / ${strategy} / ${role}`;
          expect(contrastRatio(onColor(parseColor(value)!), value), where).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(value, background), where).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('drives the neutral scale to the fixed lightnesses', () => {
    const dark = deriveDarkTheme(generatePalette(parseColor(PRIMARIES[0]!)!, 'analogous'));
    expect(parseColor(dark.background!)!.l).toBe(8);
    expect(parseColor(dark.surface!)!.l).toBe(12);
    expect(parseColor(dark['text-primary']!)!.l).toBe(95);
  });
});

describe('hueInRange', () => {
  it('wraps through zero', () => {
    expect(hueInRange(355, '350-10')).toBe(true);
    expect(hueInRange(5, '350-10')).toBe(true);
    expect(hueInRange(180, '350-10')).toBe(false);
  });

  it('handles the ordinary case and rejects garbage', () => {
    expect(hueInRange(40, '20-60')).toBe(true);
    expect(hueInRange(20, '20-60')).toBe(true);
    expect(hueInRange(61, '20-60')).toBe(false);
    expect(hueInRange(40, 'not a range')).toBe(false);
  });
});
