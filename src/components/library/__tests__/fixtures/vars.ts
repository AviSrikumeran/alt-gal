import type { ComponentSpec, ComponentSize, ComponentType, ComponentVariant } from '@/types/components';
import { ON_COLOR_ROLES, SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import { DEFAULT_TOKENS } from '@/utils/defaults';
import { DEFAULT_CONTENT } from '@/components/library/content';

/**
 * The §11.2 fixture: every CSS variable the library can reference, at fixed values.
 *
 * Built from DEFAULT_TOKENS rather than hand-listed so it cannot drift from the token shape, and exported as a
 * map rather than the spec's `vars.css` file because jsdom does not cascade custom properties from stylesheets —
 * `renderWithVars` applies them inline, which jsdom does honour.
 */
const FIXTURE_COLORS: Record<string, string> = {
  primary: 'hsl(250, 84.0%, 60.0%)',
  secondary: 'hsl(280, 76.0%, 60.0%)',
  accent: 'hsl(220, 76.0%, 60.0%)',
  danger: 'hsl(0, 84.0%, 60.0%)',
  warning: 'hsl(38, 92.0%, 50.0%)',
  success: 'hsl(142, 71.0%, 45.0%)',
  muted: 'hsl(250, 6.0%, 90.0%)',
  background: 'hsl(250, 10.0%, 98.0%)',
  surface: 'hsl(250, 10.0%, 100.0%)',
  'text-primary': 'hsl(250, 15.0%, 10.0%)',
  'text-secondary': 'hsl(250, 10.0%, 40.0%)',
  'text-muted': 'hsl(250, 8.0%, 58.0%)',
  border: 'hsl(250, 12.0%, 88.0%)',
};

/** Every var name the library may reference: the D-093 map over DEFAULT_TOKENS, plus the six derived on-colors. */
export const FIXTURE_VARS: Record<string, string> = (() => {
  const t = DEFAULT_TOKENS;
  const out: Record<string, string> = {};
  for (const role of SEMANTIC_COLOR_ROLES) out[`--color-${role}`] = FIXTURE_COLORS[role] ?? 'hsl(0, 0%, 50.0%)';
  for (const role of ON_COLOR_ROLES) out[`--color-on-${role}`] = 'hsl(0, 10.0%, 98.0%)';
  for (const [k, fam] of Object.entries(t.typography.families)) out[`--font-${k}`] = `'${fam}', sans-serif`;
  for (const [k, px] of Object.entries(t.typography.scale)) out[`--font-size-${k}`] = `${px}px`;
  for (const [k, w] of Object.entries(t.typography.weights)) out[`--font-weight-${k}`] = String(w);
  for (const [k, lh] of Object.entries(t.typography.lineHeights)) out[`--line-height-${k}`] = String(lh);
  for (const m of t.spacing.scale) out[`--spacing-${m}`] = `${m * t.spacing.unit}px`;
  for (const [k, r] of Object.entries(t.radius)) out[`--radius-${k}`] = `${r}px`;
  for (const [k, e] of Object.entries(t.elevation)) out[`--elevation-${k}`] = e;
  out['--animation-duration-fast'] = `${t.animation.durationFast}ms`;
  out['--animation-duration-normal'] = `${t.animation.durationNormal}ms`;
  out['--animation-duration-slow'] = `${t.animation.durationSlow}ms`;
  out['--animation-easing-default'] = String(t.animation.easingDefault);
  out['--animation-easing-in'] = String(t.animation.easingIn);
  out['--animation-easing-out'] = String(t.animation.easingOut);
  return out;
})();

/** A spec for any type/variant/size, with that type's default content. */
export function fixtureSpec<T extends ComponentType>(
  type: T,
  variant: ComponentVariant = 'primary',
  size: ComponentSize = 'md',
): ComponentSpec<T> {
  return {
    id: `comp_${type.replace('-', '')}`,
    type,
    variant,
    size,
    content: DEFAULT_CONTENT[type],
    pageId: null,
    sectionId: null,
    createdBy: 'human',
    createdAt: 0,
  };
}
