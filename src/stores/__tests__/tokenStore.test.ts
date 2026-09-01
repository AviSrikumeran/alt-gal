import { beforeEach, describe, expect, it } from 'vitest';
import { useTokenStore } from '@/stores/tokenStore';
import { DEFAULT_TOKENS } from '@/utils/defaults';

const store = () => useTokenStore.getState();

beforeEach(() => {
  store().reset();
});

describe('setToken normalization (D-080)', () => {
  it('accepts hex, rgb, and both hsl syntaxes and stores one form', () => {
    for (const input of ['#7c5cff', 'rgb(124, 92, 255)', 'hsl(250 100% 68%)']) {
      expect(store().setToken('color.primary', input)).toBe(true);
      expect(store().getToken('color.primary')).toMatch(/^hsl\(\d+, \d+\.\d%, \d+\.\d%\)$/);
    }
  });

  it('rejects an unparseable color without changing anything', () => {
    store().setToken('color.primary', '#7c5cff');
    const before = store().getToken('color.primary');
    expect(store().setToken('color.primary', 'rebeccapurple')).toBe(false);
    expect(store().getToken('color.primary')).toBe(before);
  });
});

describe('per-group validation (D-112)', () => {
  it('holds every documented range', () => {
    expect(store().setToken('font.body', 'Geist')).toBe(true);
    expect(store().setToken('font.body', 'Comic Sans MS')).toBe(false);
    expect(store().setToken('fontSize.base', '18')).toBe(true);
    expect(store().setToken('fontSize.base', '18.5')).toBe(false);
    expect(store().setToken('fontSize.base', '201')).toBe(false);
    expect(store().setToken('fontWeight.bold', '800')).toBe(true);
    expect(store().setToken('fontWeight.bold', '850')).toBe(false);
    expect(store().setToken('lineHeight.normal', '1.4')).toBe(true);
    expect(store().setToken('lineHeight.normal', '3.5')).toBe(false);
    expect(store().setToken('spacing.unit', '6')).toBe(true);
    expect(store().setToken('spacing.unit', '5')).toBe(false);
    expect(store().setToken('radius.md', '10')).toBe(true);
    expect(store().setToken('elevation.sm', 'none')).toBe(true);
    expect(store().setToken('elevation.sm', 'url(evil.png)')).toBe(false);
    expect(store().setToken('animation.durationFast', '120')).toBe(true);
    expect(store().setToken('animation.durationFast', '9000')).toBe(false);
    expect(store().setToken('animation.easingDefault', 'ease-in-out')).toBe(true);
    expect(store().setToken('animation.easingDefault', 'wobble')).toBe(false);
  });

  it('refuses to write a derived spacing step (D-082, D-213)', () => {
    expect(store().setToken('spacing.4', '13')).toBe(false);
    store().setToken('spacing.unit', '8');
    expect(store().getToken('spacing.4')).toBe('32');
  });
});

describe('touched and the phase count (D-047)', () => {
  it('counts non-default non-colors and forgets them when they return to the default', () => {
    expect(store().getDefinedTokenCount()).toBe(0);
    store().setToken('radius.md', '10');
    expect(store().touched).toEqual(['radius.md']);
    expect(store().getDefinedTokenCount()).toBe(1);
    store().setToken('radius.md', String(DEFAULT_TOKENS.radius.md));
    expect(store().touched).toEqual([]);
    expect(store().getDefinedTokenCount()).toBe(0);
  });

  it('counts colors directly and never puts them in touched', () => {
    store().setToken('color.primary', '#7c5cff');
    expect(store().touched).toEqual([]);
    expect(store().getDefinedTokenCount()).toBe(1);
  });

  it('reports exactly the missing phase-2 colors (D-048)', () => {
    expect(store().getMissingForPhase2()).toEqual(['color.primary', 'color.background', 'color.text-primary']);
    store().setToken('color.primary', '#7c5cff');
    store().setToken('color.background', '#ffffff');
    expect(store().getMissingForPhase2()).toEqual(['color.text-primary']);
    store().setToken('color.text-primary', '#111111');
    expect(store().getMissingForPhase2()).toEqual([]);
  });
});

describe('removeToken', () => {
  it('clears colors to null and other groups to their default', () => {
    store().setToken('color.primary', '#7c5cff');
    store().removeToken('color.primary');
    expect(store().getToken('color.primary')).toBeNull();

    store().setToken('radius.md', '10');
    store().removeToken('radius.md');
    expect(store().getToken('radius.md')).toBe(String(DEFAULT_TOKENS.radius.md));
    expect(store().touched).toEqual([]);
  });
});

describe('setMany', () => {
  it('applies a whole palette in one write and skips invalid entries', () => {
    store().setMany({
      'color.primary': '#7c5cff',
      'color.background': '#ffffff',
      'color.text-primary': 'not-a-color',
    });
    expect(store().getToken('color.primary')).not.toBeNull();
    expect(store().getToken('color.background')).not.toBeNull();
    expect(store().getToken('color.text-primary')).toBeNull();
  });
});

describe('locks (D-056, D-112)', () => {
  it('records the lock but never enforces it — that is the tools and the UI', () => {
    store().setToken('color.primary', '#7c5cff');
    store().setLocked('color.primary', true);
    expect(store().isLocked('color.primary')).toBe(true);
    // The store stays dumb so undo can restore a locked token.
    expect(store().setToken('color.primary', '#000000')).toBe(true);
    store().setLocked('color.primary', false);
    expect(store().isLocked('color.primary')).toBe(false);
  });
});

describe('getTokenMap', () => {
  it('returns a value for every TOKEN_PATH, null only for unset colors', () => {
    const map = store().getTokenMap();
    expect(map['color.primary']).toBeNull();
    expect(map['fontSize.base']).toBe('16');
    expect(map['font.mono']).toBe('JetBrains Mono');
    expect(map['spacing.unit']).toBe('4');
  });
});
