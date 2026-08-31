import type { CSSProperties } from 'react';
import type { ComponentSize, ComponentSpec, ComponentType, ComponentVariant } from '@/types/components';
import type { SemanticColorRole, TokenPath } from '@/types/tokens';
import type { ComponentStyleDef } from '@/engine/componentRenderer';
import { STYLE_DICTIONARY } from '@/engine/componentRenderer';

// ---- token references inside declarations ----------------------------------
export interface Ref {
  readonly __t: TokenPath;
  readonly wrap?: (v: string) => string;
}
export const T = (path: TokenPath, wrap?: (v: string) => string): Ref => ({ __t: path, wrap });
export type Decl = Record<string, string | number | Ref>;
export type PartDecls = Record<string, Decl>;

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
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
/** D-093. */
export function cssVarFor(path: TokenPath): string {
  const [group, key] = path.split('.') as [string, string];
  return `${GROUP_PREFIX[group]}-${kebab(key)}`;
}
export const v = (path: TokenPath) => `var(${cssVarFor(path)})`;

/** Turns one declaration into React inline styles + a token map. Single source, two outputs (D-064). */
export function defineStyle<K extends ComponentType>(
  parts: readonly string[],
  build: (spec: ComponentSpec<K>) => PartDecls,
): ComponentStyleDef<K> {
  return {
    parts,
    styles: (spec) => {
      const out: Record<string, CSSProperties> = {};
      for (const [part, decl] of Object.entries(build(spec))) {
        const css: Record<string, string | number> = {};
        for (const [prop, val] of Object.entries(decl)) {
          if (typeof val === 'object') {
            const raw = v(val.__t);
            css[prop] = val.wrap ? val.wrap(raw) : raw;
          } else css[prop] = val;
        }
        out[part] = css as CSSProperties;
      }
      return out;
    },
    tokens: (spec) => {
      const out: Record<`${string}.${string}`, TokenPath> = {};
      for (const [part, decl] of Object.entries(build(spec)))
        for (const [prop, val] of Object.entries(decl))
          if (typeof val === 'object') out[`${part}.${kebab(prop)}`] = val.__t;
      return out;
    },
  };
}

// ---- variant (D-086) --------------------------------------------------------
export const VARIANT_ROLE: Record<ComponentVariant, SemanticColorRole> = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'primary',
  danger: 'danger',
  outline: 'primary',
};
export const VARIANT_FILL: Record<ComponentVariant, 'solid' | 'transparent'> = {
  primary: 'solid',
  secondary: 'solid',
  ghost: 'transparent',
  danger: 'solid',
  outline: 'transparent',
};
export const roleOf = (variant: ComponentVariant): TokenPath => `color.${VARIANT_ROLE[variant]}`;
/** On-colors are derived vars (D-046), not TokenPaths; expose as a raw var string. */
export const onVar = (variant: ComponentVariant) => `var(--color-on-${VARIANT_ROLE[variant]})`;

/** Solid: role bg + on-color text. Transparent: role text; outline adds border; ghost adds hover tint in CSS. */
export function accentDecl(variant: ComponentVariant): Decl {
  if (VARIANT_FILL[variant] === 'solid')
    return { backgroundColor: T(roleOf(variant)), color: onVar(variant), border: '1px solid transparent' };
  return {
    backgroundColor: 'transparent',
    color: T(roleOf(variant)),
    border: variant === 'outline' ? T(roleOf(variant), (c) => `1px solid ${c}`) : '1px solid transparent',
  };
}

// ---- size (D-087) -----------------------------------------------------------
export const CONTROL_PAD: Record<
  ComponentSize,
  { block: TokenPath; inline: TokenPath; text: TokenPath; gap: TokenPath }
> = {
  sm: { block: 'spacing.2', inline: 'spacing.3', text: 'fontSize.sm', gap: 'spacing.2' },
  md: { block: 'spacing.3', inline: 'spacing.5', text: 'fontSize.base', gap: 'spacing.3' },
  lg: { block: 'spacing.4', inline: 'spacing.6', text: 'fontSize.md', gap: 'spacing.4' },
};
export const CONTAINER_PAD: Record<ComponentSize, { pad: TokenPath; gap: TokenPath }> = {
  sm: { pad: 'spacing.4', gap: 'spacing.3' },
  md: { pad: 'spacing.6', gap: 'spacing.4' },
  lg: { pad: 'spacing.8', gap: 'spacing.5' },
};

export const transition = (props: string) =>
  T('animation.durationFast', (d) => `${props} ${d} var(--animation-easing-default)`);
export const bodyText = (size: TokenPath = 'fontSize.base'): Decl => ({
  fontFamily: T('font.body'),
  fontSize: T(size),
  fontWeight: T('fontWeight.regular'),
  lineHeight: T('lineHeight.normal'),
  color: T('color.text-primary'),
});
export const headingText = (size: TokenPath, weight: TokenPath = 'fontWeight.semibold'): Decl => ({
  fontFamily: T('font.heading'),
  fontSize: T(size),
  fontWeight: T(weight),
  lineHeight: T('lineHeight.tight'),
  color: T('color.text-primary'),
  margin: 0,
});

/** Root data attributes every component sets. */
export const rootAttrs = (spec: ComponentSpec, state = 'default', selected = false) => ({
  'data-alt': spec.type,
  'data-variant': spec.variant,
  'data-size': spec.size,
  'data-state': state,
  'data-selected': selected ? 'true' : undefined,
  'data-id': spec.id,
});

/** Nested CTA reuses the button dictionary through a synthetic spec so its styles stay token-driven (D-095, D-212). */
export function nestedButtonStyles(variant: ComponentVariant, size: ComponentSize): CSSProperties {
  return (
    STYLE_DICTIONARY.button.styles({
      id: 'inline',
      type: 'button',
      variant,
      size,
      content: { label: '' },
      pageId: null,
      sectionId: null,
      createdBy: 'agent',
      createdAt: 0,
    }).root ?? {}
  );
}
