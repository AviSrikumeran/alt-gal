import { beforeEach, describe, expect, it } from 'vitest';
import { cssVarFor, tokenToCss, tokenToVars } from '@/engine/tokenToCss';
import { DEFAULT_TOKENS, UNSET_COLOR } from '@/utils/defaults';
import { useTokenStore } from '@/stores/tokenStore';
import { deriveDarkTheme, generatePalette, parseColor, toHSLString } from '@/utils/colorUtils';

beforeEach(() => {
  useTokenStore.getState().reset();
});

describe('tokenToVars', () => {
  it('emits a var for every token, on-color, and spacing step', () => {
    const vars = tokenToVars(DEFAULT_TOKENS);
    expect(Object.keys(vars).filter((k) => k.startsWith('--color-') && !k.startsWith('--color-on-'))).toHaveLength(13);
    expect(Object.keys(vars).filter((k) => k.startsWith('--color-on-'))).toHaveLength(6);
    expect(Object.keys(vars).filter((k) => k.startsWith('--spacing-'))).toHaveLength(10);
    expect(vars['--spacing-16']).toBe('64px'); // 16 x unit 4 (D-082)
    expect(vars['--font-size-base']).toBe('16px');
    expect(vars['--radius-full']).toBe('9999px');
    expect(vars['--animation-duration-fast']).toBe('150ms');
    expect(vars['--animation-easing-default']).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });

  it('falls back to the per-role sentinel for an unset color (D-109)', () => {
    const vars = tokenToVars(DEFAULT_TOKENS);
    expect(vars['--color-primary']).toBe(UNSET_COLOR.primary);
    expect(vars['--color-background']).toBe(UNSET_COLOR.background);
    // Distinct per role, so unset text stays legible on an unset background.
    expect(vars['--color-text-primary']).not.toBe(vars['--color-background']);
  });

  it('recomputes every spacing step from the unit', () => {
    useTokenStore.getState().setToken('spacing.unit', '8');
    const vars = tokenToVars(useTokenStore.getState());
    expect(vars['--spacing-1']).toBe('8px');
    expect(vars['--spacing-16']).toBe('128px');
  });

  it('emits the loaded-face variable for a catalog font (D-120, D-220)', () => {
    const vars = tokenToVars(DEFAULT_TOKENS);
    expect(vars['--font-body']).toBe('var(--font-inter), system-ui, sans-serif');
    expect(vars['--font-mono']).toBe('var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, monospace');
  });
});

describe('tokenToCss', () => {
  it('carries a set primary through to the stylesheet', () => {
    useTokenStore.getState().setToken('color.primary', '#7c5cff');
    const css = tokenToCss(useTokenStore.getState());
    expect(css).toContain('--color-primary');
    // D-080: whatever the human pastes, the store holds the normalized hsl form.
    expect(css).toContain(`--color-primary: ${toHSLString(parseColor('#7c5cff')!)};`);
    expect(css.startsWith(':root {')).toBe(true);
  });

  it('omits the .dark block until a dark theme exists (D-057)', () => {
    expect(tokenToCss(useTokenStore.getState())).not.toContain('.dark {');
    const palette = generatePalette(parseColor('hsl(250, 84%, 60%)')!, 'analogous');
    useTokenStore.getState().setMany({ 'color.primary': palette.primary });
    useTokenStore.getState().setDark(deriveDarkTheme(palette));
    const css = tokenToCss(useTokenStore.getState());
    expect(css).toContain('.dark {');
    // The dark block redefines colors and on-colors only (D-081).
    const dark = css.slice(css.indexOf('.dark {'));
    expect(dark).not.toContain('--spacing-');
    expect(dark).toContain('--color-on-primary');
  });
});

describe('cssVarFor (D-093)', () => {
  it('maps every group prefix', () => {
    expect(cssVarFor('color.primary')).toBe('--color-primary');
    expect(cssVarFor('color.text-primary')).toBe('--color-text-primary');
    expect(cssVarFor('fontSize.2xl')).toBe('--font-size-2xl');
    expect(cssVarFor('animation.durationFast')).toBe('--animation-duration-fast');
    expect(cssVarFor('lineHeight.relaxed')).toBe('--line-height-relaxed');
    expect(cssVarFor('spacing.4')).toBe('--spacing-4');
  });
});
