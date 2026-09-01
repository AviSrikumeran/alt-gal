import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyDarkTheme,
  darkThemeReport,
  deriveDarkFromTokens,
  hasDarkTheme,
  setDarkTheme,
} from '@/engine/themeEngine';
import { paletteToValues, useTokenStore } from '@/stores/tokenStore';
import { generatePalette, parseColor } from '@/utils/colorUtils';

const tokens = () => useTokenStore.getState();

beforeEach(() => {
  tokens().reset();
  tokens().setMany(paletteToValues(generatePalette(parseColor('hsl(250, 84%, 60%)')!, 'analogous')));
});

describe('themeEngine', () => {
  it('derives without writing', () => {
    const derived = deriveDarkFromTokens();
    expect(parseColor(derived.background!)?.l).toBe(8);
    expect(hasDarkTheme()).toBe(false);
  });

  it('writes the dark set and hands back the previous one for undo (D-061)', () => {
    const first = applyDarkTheme();
    expect(first.previous).toBeNull();
    expect(hasDarkTheme()).toBe(true);
    expect(first.skipped).toEqual([]);
    expect(first.derived).toHaveLength(13);

    const second = applyDarkTheme();
    expect(second.previous).toEqual(first.dark);

    setDarkTheme(first.previous);
    expect(hasDarkTheme()).toBe(false);
  });

  it('skips roles the human never set', () => {
    tokens().removeToken('color.warning');
    const result = applyDarkTheme();
    expect(result.skipped).toEqual(['warning']);
    expect(result.dark.warning).toBeNull();
  });

  it('reports contrast that clears the D-164 floors', () => {
    const { dark } = applyDarkTheme();
    for (const row of darkThemeReport(dark)) {
      expect(row.onContrast, row.role).toBeGreaterThanOrEqual(4.5);
      expect(row.bg, row.role).toBeGreaterThanOrEqual(3);
    }
  });
});
