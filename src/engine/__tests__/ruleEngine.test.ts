import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentSize, ComponentSpec, ComponentType, ComponentVariant } from '@/types/components';
import type { DesignRule, RuleCondition } from '@/types/rules';
import { DEFAULT_CONTENT } from '@/components/library/content';
import { useComponentStore } from '@/stores/componentStore';
import { useRuleStore } from '@/stores/ruleStore';
import { useTokenStore } from '@/stores/tokenStore';
import { DEFAULT_TOKENS, UNSET_COLOR } from '@/utils/defaults';
import type * as ColorUtils from '@/utils/colorUtils';

/**
 * `colorUtils` ships as signatures until Stream 1 lands (§11.2), so `parseColor`, `contrastRatio` and
 * `hueInRange` are stubbed in the seed. This isolation test substitutes the Turn 6 §6.1 reference
 * implementations verbatim so it exercises the rule engine's own wiring — operators, messages, alternatives,
 * memoization — rather than Stream 1's arithmetic. Stream 1 owns the tests for these three functions.
 */
vi.mock('@/utils/colorUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof ColorUtils>();
  const norm360 = (h: number) => ((h % 360) + 360) % 360;
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const HSL_RE = /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*\)$/i;

  const parseColor = (input: string) => {
    const m = HSL_RE.exec(input.trim());
    return m
      ? { h: norm360(+(m[1] as string)), s: clamp(+(m[2] as string), 0, 100), l: clamp(+(m[3] as string), 0, 100) }
      : null;
  };
  const hslToRgb = ({ h, s, l }: { h: number; s: number; l: number }) => {
    const S = s / 100;
    const L = l / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const a = S * Math.min(L, 1 - L);
      return L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
  };
  const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const lin = (c: number) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  return {
    ...actual,
    parseColor,
    hslToRgb,
    contrastRatio: (a: string, b: string) => {
      const A = parseColor(a);
      const B = parseColor(b);
      if (!A || !B) return 1;
      const la = luminance(hslToRgb(A));
      const lb = luminance(hslToRgb(B));
      const [hi, lo] = la > lb ? [la, lb] : [lb, la];
      return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
    },
    hueInRange: (h: number, range: string) => {
      const m = /^\s*(\d{1,3})\s*-\s*(\d{1,3})\s*$/.exec(range);
      if (!m) return false;
      const a = norm360(+(m[1] as string));
      const b = norm360(+(m[2] as string));
      const x = norm360(h);
      return a <= b ? x >= a && x <= b : x >= a || x <= b;
    },
  };
});

const { evaluateAll, evaluateSpec, resolveProperty, violationsFor } = await import('@/engine/ruleEngine');

// ---- fixtures ---------------------------------------------------------------

let seq = 0;
function spec<T extends ComponentType>(
  type: T,
  variant: ComponentVariant = 'primary',
  size: ComponentSize = 'md',
): ComponentSpec<T> {
  return {
    id: `comp_test${(seq += 1)}`,
    type,
    variant,
    size,
    content: DEFAULT_CONTENT[type],
    pageId: null,
    sectionId: null,
    createdBy: 'agent',
    createdAt: 0,
  };
}

function rule(description: string, condition: RuleCondition, enabled = true): DesignRule {
  return {
    id: `rule_${description.replace(/\W/g, '').slice(0, 8).toLowerCase()}`,
    type: 'custom',
    description,
    condition,
    enabled,
    createdBy: 'human',
    createdAt: 0,
  };
}

/** The five presets shipped in the Rule editor (D-113). */
const PRESETS = {
  noDangerButtons: rule('No danger buttons', {
    target: 'button',
    property: 'variant',
    operator: 'equals',
    value: 'danger',
  }),
  noRedPrimaries: rule('No red primaries', {
    target: 'all',
    property: 'background-color',
    operator: 'hue-not-in',
    value: '345-15',
  }),
  minRadius: rule('Minimum radius 8px', {
    target: 'all',
    property: 'border-radius',
    operator: 'min',
    value: '8',
  }),
  textContrast: rule('Text contrast at least 4.5:1', {
    target: 'all',
    property: 'contrast',
    operator: 'min',
    value: '4.5',
  }),
  touchTargets: rule('Touch targets at least 44px', {
    target: 'button',
    property: 'min-height',
    operator: 'min',
    value: '44',
  }),
};

const setColors = (colors: Partial<Record<keyof typeof DEFAULT_TOKENS.colors, string>>) =>
  useTokenStore.setState({ colors: { ...DEFAULT_TOKENS.colors, ...colors } });

beforeEach(() => {
  useTokenStore.setState(structuredClone(DEFAULT_TOKENS));
  useComponentStore.getState().reset();
  useRuleStore.getState().reset();
});

// ---- resolveProperty (D-166) ------------------------------------------------

describe('resolveProperty', () => {
  it('reads spec fields directly', () => {
    const s = spec('button', 'danger', 'lg');
    expect(resolveProperty(s, 'variant')).toBe('danger');
    expect(resolveProperty(s, 'size')).toBe('lg');
    expect(resolveProperty(s, 'type')).toBe('button');
  });

  it('resolves a colour through the style dictionary to the token value', () => {
    setColors({ primary: 'hsl(250, 84.0%, 60.0%)' });
    expect(resolveProperty(spec('button', 'primary'), 'background-color')).toBe('hsl(250, 84.0%, 60.0%)');
  });

  it('returns null for an unset colour rather than judging its D-109 sentinel (I-1)', () => {
    // The sentinel is a grey the studio painted, not a value the human chose. Rules skip it the
    // same way they skip a property the component type does not have.
    expect(resolveProperty(spec('button', 'primary'), 'background-color')).toBeNull();
    setColors({ primary: UNSET_COLOR.primary });
    // Once the human actually picks that grey, it is a real value and resolves normally.
    expect(resolveProperty(spec('button', 'primary'), 'background-color')).toBe(UNSET_COLOR.primary);
  });

  it('returns null when the property does not apply to the type', () => {
    // A solid button paints its text with the derived --color-on-* var, which is not a token (D-046).
    expect(resolveProperty(spec('button', 'primary'), 'color')).toBeNull();
    // An input's radius lives on its field part, not its root.
    expect(resolveProperty(spec('input'), 'border-radius')).toBeNull();
    expect(resolveProperty(spec('navbar'), 'border-radius')).toBeNull();
  });

  it('reads a transparent variant colour, which is a real token', () => {
    setColors({ primary: 'hsl(250, 84.0%, 60.0%)' });
    expect(resolveProperty(spec('button', 'ghost'), 'color')).toBe('hsl(250, 84.0%, 60.0%)');
  });

  it('resolves border-radius and font-size as plain numbers', () => {
    expect(resolveProperty(spec('button'), 'border-radius')).toBe('8'); // radius.md
    expect(resolveProperty(spec('button', 'primary', 'lg'), 'font-size')).toBe('18'); // fontSize.md
  });

  it('computes min-height as 2 x padding-block + font-size x line-height (D-165)', () => {
    expect(resolveProperty(spec('button', 'primary', 'sm'), 'min-height')).toBe('32.8');
    expect(resolveProperty(spec('button', 'primary', 'md'), 'min-height')).toBe('43.2');
    expect(resolveProperty(spec('button', 'primary', 'lg'), 'min-height')).toBe('53.6');
  });

  it('returns null for min-height when the root has no vertical padding', () => {
    expect(resolveProperty(spec('card'), 'min-height')).toBeNull();
  });

  it('falls back to text-primary on background for contrast', () => {
    setColors({ 'text-primary': 'hsl(0, 0%, 0%)', background: 'hsl(0, 0%, 100%)', primary: 'hsl(0, 0%, 100%)' });
    // A solid button: no root colour token, so the fallback text-primary is used against its own background.
    expect(resolveProperty(spec('button', 'primary'), 'contrast')).toBe('21');
  });
});

// ---- the five presets (D-113) ----------------------------------------------

describe('preset: No danger buttons', () => {
  const rules = [PRESETS.noDangerButtons];

  it('flags a danger button and offers the remaining variants', () => {
    const [violation, ...rest] = evaluateSpec(spec('button', 'danger'), rules);
    expect(rest).toEqual([]);
    expect(violation?.property).toBe('variant');
    expect(violation?.currentValue).toBe('danger');
    expect(violation?.alternatives).toEqual(['primary', 'secondary', 'ghost', 'outline']);
    expect(violation?.message).toBe(
      'Rule "No danger buttons" prohibits variant "danger" for button. Choose one of: primary, secondary, ghost, outline.',
    );
  });

  it('passes any other variant', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'outline'] as const)
      expect(evaluateSpec(spec('button', variant), rules)).toEqual([]);
  });

  it('ignores types the rule does not target', () => {
    expect(evaluateSpec(spec('card', 'danger'), rules)).toEqual([]);
  });
});

describe('preset: No red primaries', () => {
  const rules = [PRESETS.noRedPrimaries];

  it('flags a red background and names the token to change', () => {
    setColors({ primary: 'hsl(2, 84.0%, 60.0%)' });
    const [violation] = evaluateSpec(spec('button', 'primary'), rules);
    expect(violation?.property).toBe('background-color');
    expect(violation?.alternatives).toEqual([]);
    expect(violation?.message).toBe(
      'Rule "No red primaries" prohibits background-color "hsl(2, 84.0%, 60.0%)" for button. Change color.primary to a hue outside 345-15.',
    );
  });

  it('wraps the range across 0 degrees', () => {
    setColors({ primary: 'hsl(350, 84.0%, 60.0%)' });
    expect(evaluateSpec(spec('button'), rules)).toHaveLength(1);
    setColors({ primary: 'hsl(250, 84.0%, 60.0%)' });
    expect(evaluateSpec(spec('button'), rules)).toEqual([]);
  });

  it('skips components whose root has no background-color token', () => {
    setColors({ primary: 'hsl(2, 84.0%, 60.0%)' });
    expect(evaluateSpec(spec('button', 'ghost'), rules)).toEqual([]);
  });
});

describe('preset: Minimum radius 8px', () => {
  const rules = [PRESETS.minRadius];

  it('passes at the default radius scale', () => {
    expect(evaluateSpec(spec('button'), rules)).toEqual([]);
    expect(evaluateSpec(spec('card'), rules)).toEqual([]);
  });

  it('flags a component once its driving token drops below the minimum', () => {
    useTokenStore.setState({ radius: { ...DEFAULT_TOKENS.radius, md: 4 } });
    const [violation] = evaluateSpec(spec('button'), rules);
    expect(violation?.currentValue).toBe('4');
    expect(violation?.message).toBe(
      'Rule "Minimum radius 8px" prohibits border-radius "4" for button. Raise radius.md so border-radius is at least 8.',
    );
  });

  it('leaves types with no root radius alone', () => {
    useTokenStore.setState({ radius: { ...DEFAULT_TOKENS.radius, md: 4, lg: 4, full: 4 } });
    expect(evaluateSpec(spec('navbar'), rules)).toEqual([]);
    expect(evaluateSpec(spec('hero'), rules)).toEqual([]);
  });
});

describe('preset: Text contrast at least 4.5:1', () => {
  const rules = [PRESETS.textContrast];

  it('passes when the fallback pair is legible', () => {
    setColors({ 'text-primary': 'hsl(0, 0%, 10.0%)', background: 'hsl(0, 0%, 100.0%)', primary: 'hsl(0, 0%, 100.0%)' });
    expect(evaluateSpec(spec('button', 'primary'), rules)).toEqual([]);
  });

  it('flags a washed-out pair and names both tokens', () => {
    setColors({ 'text-primary': 'hsl(0, 0%, 78.0%)', background: 'hsl(0, 0%, 100.0%)', primary: 'hsl(0, 0%, 100.0%)' });
    const [violation] = evaluateSpec(spec('button', 'primary'), rules);
    expect(violation?.property).toBe('contrast');
    expect(violation?.message).toContain('Change color.text-primary or color.background');
  });
});

describe('preset: Touch targets at least 44px', () => {
  const rules = [PRESETS.touchTargets];

  it('flags sm and md buttons and passes lg (D-165 arithmetic)', () => {
    expect(evaluateSpec(spec('button', 'primary', 'sm'), rules)).toHaveLength(1);
    expect(evaluateSpec(spec('button', 'primary', 'md'), rules)).toHaveLength(1);
    expect(evaluateSpec(spec('button', 'primary', 'lg'), rules)).toEqual([]);
  });

  it('passes md once spacing.unit is raised to 5, the fix the auditor suggests', () => {
    useTokenStore.setState({ spacing: { ...DEFAULT_TOKENS.spacing, unit: 5 } });
    expect(evaluateSpec(spec('button', 'primary', 'md'), rules)).toEqual([]);
  });
});

// ---- engine behaviour -------------------------------------------------------

describe('evaluateSpec', () => {
  it('skips disabled rules (D-059 `enabled`)', () => {
    const disabled = rule(
      'No danger buttons',
      { target: 'button', property: 'variant', operator: 'equals', value: 'danger' },
      false,
    );
    expect(evaluateSpec(spec('button', 'danger'), [disabled])).toEqual([]);
  });

  it('reports every violated rule for one spec', () => {
    setColors({ primary: 'hsl(2, 84.0%, 60.0%)' });
    // danger is unset, so background-color and contrast resolve to null and their rules are
    // skipped (I-1). Only the two rules that read real values are reported.
    const violations = evaluateSpec(spec('button', 'danger', 'sm'), Object.values(PRESETS));
    expect(violations.map((v) => v.property).sort()).toEqual(['min-height', 'variant']);
    for (const v of violations) expect(v.ruleDescription).toBeTruthy();
  });

  it('never mutates the spec or the stores (D-116: flag, never remove)', () => {
    const s = spec('button', 'danger');
    const before = structuredClone(s);
    evaluateSpec(s, Object.values(PRESETS));
    expect(s).toEqual(before);
    expect(useComponentStore.getState().components).toEqual([]);
  });
});

describe('evaluateAll', () => {
  it('walks every component in the store against the enabled rules', () => {
    const good = spec('button', 'primary', 'lg');
    const bad = spec('button', 'danger', 'lg');
    useComponentStore.getState().add(good);
    useComponentStore.getState().add(bad);
    useRuleStore.getState().add(PRESETS.noDangerButtons);

    const violations = evaluateAll();
    expect(violations).toHaveLength(1);
    expect(violations[0]?.componentId).toBe(bad.id);
    expect(violationsFor(bad.id)).toHaveLength(1);
    expect(violationsFor(good.id)).toEqual([]);
  });

  it('includes page-owned components (D-053)', () => {
    useComponentStore.getState().add({ ...spec('button', 'danger', 'lg'), pageId: 'page_1', sectionId: 'sec_1' });
    useRuleStore.getState().add(PRESETS.noDangerButtons);
    expect(evaluateAll()).toHaveLength(1);
  });

  it('memoizes until rules, components or the tokens it reads change (D-115)', () => {
    useComponentStore.getState().add(spec('button', 'primary', 'lg'));
    useRuleStore.getState().add(PRESETS.minRadius);

    const first = evaluateAll();
    expect(evaluateAll()).toBe(first); // same reference: nothing changed

    useTokenStore.setState({ radius: { ...DEFAULT_TOKENS.radius, md: 4 } });
    const afterToken = evaluateAll();
    expect(afterToken).not.toBe(first);
    expect(afterToken).toHaveLength(1);

    useRuleStore.getState().setEnabled(PRESETS.minRadius.id, false);
    expect(evaluateAll()).toEqual([]);
  });

  it('returns nothing when no rules exist', () => {
    useComponentStore.getState().add(spec('button', 'danger', 'sm'));
    expect(evaluateAll()).toEqual([]);
  });
});
