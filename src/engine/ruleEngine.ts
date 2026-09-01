import type { ComponentSpec } from '@/types/components';
import { COMPONENT_SIZES, COMPONENT_TYPES, COMPONENT_VARIANTS } from '@/types/components';
import type { DesignRule, RuleOperator, RuleProperty, RuleViolation } from '@/types/rules';
import type { SemanticColorRole, TokenPath, TokenState } from '@/types/tokens';
import { useComponentStore } from '@/stores/componentStore';
import { useRuleStore } from '@/stores/ruleStore';
import { useTokenStore } from '@/stores/tokenStore';
import { contrastRatio, hueInRange, parseColor } from '@/utils/colorUtils';
import { UNSET_COLOR } from '@/utils/defaults';
import type { ComponentStyleDef } from './componentRenderer';
import { STYLE_DICTIONARY } from './componentRenderer';

/**
 * Rule evaluation (D-114, D-166). The engine reads the style dictionary to find the token behind a CSS property,
 * resolves that token against `tokenStore`, and applies the rule's operator. It never mutates and never removes a
 * component: existing violations are flagged, new generations that would violate are rejected by the tool (D-116).
 */

/** The dictionary key `tokens()` produces for a root-level property, e.g. `root.background-color`. */
type RootKey = `root.${string}`;

/**
 * Token values are read from `TokenState` rather than `tokenStore.getToken` so that a numeric group keeps its
 * number (`8`, not `'8px'`) and so Stream 2 evaluates identically before Stream 1's reads land. Colors fall back
 * to the D-109 sentinel, which is what the canvas is actually showing (D-166: "token value or sentinel").
 */
function tokenValue(state: TokenState, path: TokenPath): string | null {
  const [group, key] = path.split('.') as [string, string];
  switch (group) {
    case 'color': {
      const role = key as SemanticColorRole;
      return state.colors[role] ?? UNSET_COLOR[role];
    }
    case 'font':
      return state.typography.families[key as keyof TokenState['typography']['families']] ?? null;
    case 'fontSize':
      return num(state.typography.scale[key as keyof TokenState['typography']['scale']]);
    case 'fontWeight':
      return num(state.typography.weights[key as keyof TokenState['typography']['weights']]);
    case 'lineHeight':
      return num(state.typography.lineHeights[key as keyof TokenState['typography']['lineHeights']]);
    case 'spacing':
      // D-213: `spacing.<step>` is the multiplier; only `spacing.unit` is stored.
      return key === 'unit' ? num(state.spacing.unit) : num(state.spacing.unit * Number(key));
    case 'radius':
      return num(state.radius[key as keyof TokenState['radius']]);
    case 'elevation':
      return state.elevation[key as keyof TokenState['elevation']] ?? null;
    case 'animation': {
      const a = state.animation[key as keyof TokenState['animation']];
      return a === undefined ? null : String(a);
    }
    default:
      return null;
  }
}
const num = (n: number | undefined) => (n === undefined ? null : String(n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The token map for a spec's root part, keyed `root.<kebab-css-property>`. */
function rootTokens(spec: ComponentSpec): Record<string, TokenPath> {
  return (STYLE_DICTIONARY[spec.type] as ComponentStyleDef).tokens(spec);
}

function rootToken(spec: ComponentSpec, cssProperty: string): TokenPath | null {
  return rootTokens(spec)[`root.${cssProperty}` satisfies RootKey] ?? null;
}

/**
 * D-166. `variant`/`size`/`type` come straight off the spec. The four CSS properties resolve through the style
 * dictionary to a token and then to its value. `min-height` is computed from the root's box metrics. `contrast`
 * is the root's text on the root's background, falling back to text-primary on background.
 * Returns null when the property does not apply to this component type, which skips the rule.
 */
export function resolveProperty(spec: ComponentSpec, property: RuleProperty): string | null {
  const state = useTokenStore.getState();
  const resolve = (cssProperty: string): string | null => {
    const path = rootToken(spec, cssProperty);
    return path ? tokenValue(state, path) : null;
  };

  switch (property) {
    case 'variant':
      return spec.variant;
    case 'size':
      return spec.size;
    case 'type':
      return spec.type;
    case 'background-color':
    case 'color':
    case 'border-radius':
    case 'font-size':
      return resolve(property);
    case 'min-height': {
      // 2 x padding-block + font-size x line-height. Null when the root has no vertical padding (D-114).
      const pad = resolve('padding-block');
      const size = resolve('font-size');
      const lh = resolve('line-height');
      if (pad === null || size === null) return null;
      // Rounded to 2dp: the raw product is float-noisy (53.599999999999994) and this value is quoted back to
      // the agent and the human in the D-118 message.
      return String(round2(2 * Number(pad) + Number(size) * Number(lh ?? 1)));
    }
    case 'contrast': {
      const fg = resolve('color') ?? tokenValue(state, 'color.text-primary');
      const bg = resolve('background-color') ?? tokenValue(state, 'color.background');
      if (fg === null || bg === null) return null;
      return String(contrastRatio(fg, bg));
    }
    default:
      return null;
  }
}

/** True when the condition is violated. Operator semantics per Turn 6 §6.3: `value` names what the rule forbids. */
function violates(operator: RuleOperator, current: string, value: string): boolean {
  switch (operator) {
    case 'equals':
      return current === value;
    case 'not-equals':
      return current !== value;
    case 'min':
      return !(parseFloat(current) >= parseFloat(value));
    case 'max':
      return !(parseFloat(current) <= parseFloat(value));
    case 'not-contains':
      return current.includes(value);
    case 'hue-not-in': {
      const c = parseColor(current);
      return c !== null && hueInRange(c.h, value);
    }
    default:
      return false;
  }
}

const ENUM_FOR: Partial<Record<RuleProperty, readonly string[]>> = {
  variant: COMPONENT_VARIANTS,
  size: COMPONENT_SIZES,
  type: COMPONENT_TYPES,
};

/**
 * Turn 6 §6.3: spec-field properties under `equals`/`not-equals` offer the enum minus the forbidden value.
 * Token-driven properties (`hue-not-in`, `min`, `max`) have no enumerable alternative; the message carries the
 * token hint instead (D-118).
 */
function alternativesFor(rule: DesignRule): string[] {
  const { property, operator, value } = rule.condition;
  const options = ENUM_FOR[property];
  if (!options) return [];
  if (operator === 'equals') return options.filter((o) => o !== value);
  if (operator === 'not-equals') return options.filter((o) => o === value);
  return [];
}

/** D-118 message format; when there are no alternatives the tail names the token to change and the passing range. */
function messageFor(rule: DesignRule, spec: ComponentSpec, current: string, alternatives: string[]): string {
  const { property, operator, value } = rule.condition;
  const head = `Rule "${rule.description}" prohibits ${property} "${current}" for ${spec.type}.`;
  if (alternatives.length > 0) return `${head} Choose one of: ${alternatives.join(', ')}.`;

  const token = rootToken(spec, property === 'min-height' ? 'padding-block' : property);
  const name = token ?? 'the driving token';
  switch (operator) {
    case 'min':
      return property === 'contrast'
        ? `${head} Change color.text-primary or color.background so their contrast is at least ${value}.`
        : `${head} Raise ${name} so ${property} is at least ${value}.`;
    case 'max':
      return `${head} Lower ${name} so ${property} is at most ${value}.`;
    case 'hue-not-in':
      return `${head} Change ${name} to a hue outside ${value}.`;
    case 'not-contains':
      return `${head} Remove "${value}" from ${name}.`;
    default:
      return `${head} Change ${name}.`;
  }
}

/** Evaluate one spec against enabled rules. componentId may be null for a pre-creation check. */
export function evaluateSpec(spec: ComponentSpec, rules: DesignRule[]): RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.condition.target !== 'all' && rule.condition.target !== spec.type) continue;
    const { property, operator, value } = rule.condition;
    const current = resolveProperty(spec, property);
    if (current === null) continue; // property not applicable to this type
    if (!violates(operator, current, value)) continue;
    const alternatives = alternativesFor(rule);
    out.push({
      ruleId: rule.id,
      ruleDescription: rule.description,
      componentId: spec.id,
      property,
      currentValue: current,
      message: messageFor(rule, spec, current, alternatives),
      alternatives,
    });
  }
  return out;
}

/**
 * D-115. Memoized on the inputs that can change an outcome: the enabled rules, every spec, and the token groups
 * the resolvers read. Any `add_rule`, `set_token`, `removeToken` or `modify_component` changes the signature, so
 * the next read recomputes without an explicit invalidation call.
 */
let memoKey: string | null = null;
let memoValue: RuleViolation[] = [];

/** All components in componentStore against all enabled rules. */
export function evaluateAll(): RuleViolation[] {
  const rules = useRuleStore.getState().listEnabled();
  const components = useComponentStore.getState().list();
  const t = useTokenStore.getState();
  const key = JSON.stringify([rules, components, t.colors, t.radius, t.typography.scale, t.spacing.unit]);
  if (key === memoKey) return memoValue;
  memoKey = key;
  memoValue = components.flatMap((spec) => evaluateSpec(spec, rules));
  return memoValue;
}

/** Violations for one component, from the memoized set. Specimen badges read this (D-115). */
export function violationsFor(componentId: string): RuleViolation[] {
  return evaluateAll().filter((v) => v.componentId === componentId);
}
