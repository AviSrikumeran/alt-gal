import type { SemanticColorRole, TokenPath, TokenState } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES, ON_COLOR_ROLES } from '@/types/tokens';
import { parseColor, onColor } from '@/utils/colorUtils';
import { fontStack } from '@/utils/fonts';
import { UNSET_COLOR } from '@/utils/defaults';

/** Colors + derived on-colors for one theme. Shared by `:root` and `.dark` (D-046, D-109). */
function colorVars(colors: Record<SemanticColorRole, string | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const role of SEMANTIC_COLOR_ROLES) out[`--color-${role}`] = colors[role] ?? UNSET_COLOR[role];
  for (const role of ON_COLOR_ROLES) {
    const base = parseColor(colors[role] ?? UNSET_COLOR[role]);
    out[`--color-on-${role}`] = base ? onColor(base) : 'hsl(0, 0%, 100%)';
  }
  return out;
}

const block = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

/**
 * Produces the full stylesheet: a `:root { … }` block with every var (60 tokens + 6 on-colors + 10 spacing steps),
 * and a `.dark { … }` block when state.dark is non-null. Null colors → sentinel (Turn 4).
 * Var names: --color-<role>, --color-on-<role>, --font-<key>, --font-size-<key>, --font-weight-<key>,
 * --line-height-<key>, --spacing-<multiplier>, --radius-<key>, --elevation-<key>,
 * --animation-duration-{fast,normal,slow}, --animation-easing-{default,in,out}.
 */
export function tokenToCss(state: TokenState): string {
  const root = block(tokenToVars(state));
  const dark = state.dark ? `\n.dark {\n${block(colorVars(state.dark))}\n}` : '';
  return `:root {\n${root}\n}${dark}`;
}

/** Same vars as a map, for export and the Tool Inspector. */
export function tokenToVars(state: TokenState): Record<string, string> {
  const out: Record<string, string> = { ...colorVars(state.colors) };
  for (const [k, family] of Object.entries(state.typography.families)) out[`--font-${k}`] = fontStack(family);
  for (const [k, px] of Object.entries(state.typography.scale)) out[`--font-size-${k}`] = `${px}px`;
  for (const [k, w] of Object.entries(state.typography.weights)) out[`--font-weight-${k}`] = String(w);
  for (const [k, lh] of Object.entries(state.typography.lineHeights)) out[`--line-height-${k}`] = String(lh);
  // D-082, D-213: the human edits spacing.unit; every step is unit x multiplier.
  for (const m of state.spacing.scale) out[`--spacing-${m}`] = `${m * state.spacing.unit}px`;
  for (const [k, r] of Object.entries(state.radius)) out[`--radius-${k}`] = `${r}px`;
  for (const [k, e] of Object.entries(state.elevation)) out[`--elevation-${k}`] = e;
  out['--animation-duration-fast'] = `${state.animation.durationFast}ms`;
  out['--animation-duration-normal'] = `${state.animation.durationNormal}ms`;
  out['--animation-duration-slow'] = `${state.animation.durationSlow}ms`;
  out['--animation-easing-default'] = String(state.animation.easingDefault);
  out['--animation-easing-in'] = String(state.animation.easingIn);
  out['--animation-easing-out'] = String(state.animation.easingOut);
  return out;
}

const GROUP_PREFIX: Record<string, string> = {
  color: '--color',
  font: '--font',
  fontSize: '--font-size',
  fontWeight: '--font-weight',
  lineHeight: '--line-height',
  spacing: '--spacing',
  radius: '--radius',
  elevation: '--elevation',
  animation: '--animation',
};
const kebab = (s: string): string => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** 'color.primary' → '--color-primary'; 'fontSize.2xl' → '--font-size-2xl'; 'animation.durationFast' → '--animation-duration-fast'. */
export function cssVarFor(path: TokenPath): string {
  const [group, key] = path.split('.') as [string, string];
  return `${GROUP_PREFIX[group] ?? `--${kebab(group)}`}-${kebab(key)}`;
}
