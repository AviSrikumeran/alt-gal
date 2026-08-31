import type { CSSProperties } from 'react';
import type { ComponentSpec, ComponentType, TokenMapping } from '@/types/components';
import type { TokenPath } from '@/types/tokens';
import {
  defineStyle,
  T,
  accentDecl,
  roleOf,
  onVar,
  CONTROL_PAD,
  CONTAINER_PAD,
  transition,
  bodyText,
  headingText,
  cssVarFor,
} from '@/components/library/_shared';
import type { PartDecls } from '@/components/library/_shared';
import { useTokenStore } from '@/stores/tokenStore';

export interface ComponentStyleDef<K extends ComponentType = ComponentType> {
  parts: readonly string[];
  styles(spec: ComponentSpec<K>): Record<string, CSSProperties>;
  tokens(spec: ComponentSpec<K>): Record<`${string}.${string}`, TokenPath>;
}
export type StyleDictionary = { [K in ComponentType]: ComponentStyleDef<K> };

export const STYLE_DICTIONARY: StyleDictionary = {
  // -------------------------------------------------------------- button
  button: defineStyle<'button'>(['root'], (s) => {
    const p = CONTROL_PAD[s.size];
    return {
      root: {
        ...accentDecl(s.variant),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: T(p.gap),
        paddingBlock: T(p.block),
        paddingInline: T(p.inline),
        fontFamily: T('font.body'),
        fontSize: T(p.text),
        fontWeight: T('fontWeight.semibold'),
        lineHeight: T('lineHeight.tight'),
        borderRadius: T('radius.md'),
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        transition: transition('background-color, color, border-color, box-shadow, transform'),
      },
    };
  }),
  // -------------------------------------------------------------- card
  card: defineStyle<'card'>(['root', 'title', 'body', 'actions'], (s) => {
    const c = CONTAINER_PAD[s.size];
    return {
      root: {
        display: 'flex',
        flexDirection: 'column',
        gap: T(c.gap),
        padding: T(c.pad),
        backgroundColor: T('color.surface'),
        border: T('color.border', (b) => `1px solid ${b}`),
        borderTop: T(roleOf(s.variant), (a) => `3px solid ${a}`),
        borderRadius: T('radius.lg'),
        boxShadow: T('elevation.sm'),
        transition: transition('box-shadow, transform'),
      },
      title: headingText('fontSize.lg'),
      body: { ...bodyText(), color: T('color.text-secondary'), lineHeight: T('lineHeight.relaxed'), margin: 0 },
      actions: { display: 'flex', gap: T('spacing.3'), marginTop: T('spacing.2') },
    };
  }),
  // -------------------------------------------------------------- input / textarea (same dictionary shape)
  input: defineStyle<'input'>(['root', 'label', 'field', 'helper'], (s) => inputDecls(s.size, s.variant)),
  textarea: defineStyle<'textarea'>(['root', 'label', 'field', 'helper'], (s) => ({
    ...inputDecls(s.size, s.variant),
    field: {
      ...inputDecls(s.size, s.variant).field,
      minHeight: T('spacing.16', (x) => `calc(${x} * 2)`),
      resize: 'vertical',
      lineHeight: T('lineHeight.normal'),
    },
  })),
  // -------------------------------------------------------------- select
  select: defineStyle<'select'>(['root', 'label', 'field', 'chevron'], (s) => ({
    ...inputDecls(s.size, s.variant),
    field: {
      ...inputDecls(s.size, s.variant).field,
      appearance: 'none',
      paddingInlineEnd: T('spacing.10'),
      cursor: 'pointer',
    },
    chevron: {
      position: 'absolute',
      right: T('spacing.3'),
      bottom: T(CONTROL_PAD[s.size].block),
      width: T('spacing.4'),
      height: T('spacing.4'),
      color: T('color.text-muted'),
      pointerEvents: 'none',
    },
  })),
  // -------------------------------------------------------------- toggle
  toggle: defineStyle<'toggle'>(['root', 'track', 'thumb', 'label'], (s) => {
    const track: Record<typeof s.size, [TokenPath, TokenPath]> = {
      sm: ['spacing.8', 'spacing.4'],
      md: ['spacing.10', 'spacing.5'],
      lg: ['spacing.12', 'spacing.6'],
    };
    const [w, h] = track[s.size];
    return {
      root: { display: 'inline-flex', alignItems: 'center', gap: T(CONTROL_PAD[s.size].gap), cursor: 'pointer' },
      track: {
        position: 'relative',
        width: T(w),
        height: T(h),
        borderRadius: T('radius.full'),
        backgroundColor: s.content.checked ? T(roleOf(s.variant)) : T('color.muted'),
        border: '1px solid transparent',
        transition: transition('background-color'),
      },
      thumb: {
        position: 'absolute',
        top: '1px',
        left: s.content.checked ? T(h, (x) => `calc(100% - ${x} + 1px)`) : '1px',
        width: T(h, (x) => `calc(${x} - 4px)`),
        height: T(h, (x) => `calc(${x} - 4px)`),
        borderRadius: T('radius.full'),
        backgroundColor: T('color.surface'),
        boxShadow: T('elevation.sm'),
        transition: transition('left'),
      },
      label: { ...bodyText(CONTROL_PAD[s.size].text), fontWeight: T('fontWeight.medium') },
    };
  }),
  // -------------------------------------------------------------- badge
  badge: defineStyle<'badge'>(['root'], (s) => ({
    root: {
      ...accentDecl(s.variant),
      display: 'inline-flex',
      alignItems: 'center',
      gap: T('spacing.1'),
      paddingBlock: T('spacing.1'),
      paddingInline: T(s.size === 'sm' ? 'spacing.2' : 'spacing.3'),
      fontFamily: T('font.body'),
      fontSize: T(s.size === 'lg' ? 'fontSize.sm' : 'fontSize.xs'),
      fontWeight: T('fontWeight.medium'),
      lineHeight: T('lineHeight.tight'),
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      borderRadius: T('radius.full'),
      whiteSpace: 'nowrap',
    },
  })),
  // -------------------------------------------------------------- avatar
  avatar: defineStyle<'avatar'>(['root'], (s) => {
    const dim: Record<typeof s.size, TokenPath> = { sm: 'spacing.8', md: 'spacing.10', lg: 'spacing.16' };
    const txt: Record<typeof s.size, TokenPath> = { sm: 'fontSize.xs', md: 'fontSize.sm', lg: 'fontSize.lg' };
    return {
      root: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: T(dim[s.size]),
        height: T(dim[s.size]),
        borderRadius: T('radius.full'),
        backgroundColor: T(roleOf(s.variant)),
        color: onVar(s.variant),
        fontFamily: T('font.heading'),
        fontSize: T(txt[s.size]),
        fontWeight: T('fontWeight.semibold'),
        letterSpacing: '0.02em',
        userSelect: 'none',
      },
    };
  }),
  // -------------------------------------------------------------- navbar
  navbar: defineStyle<'navbar'>(['root', 'brand', 'links', 'link', 'cta'], (s) => ({
    root: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: T('spacing.6'),
      paddingBlock: T('spacing.4'),
      paddingInline: T('spacing.8'),
      backgroundColor: T('color.surface'),
      borderBottom: T('color.border', (b) => `1px solid ${b}`),
      boxShadow: T('elevation.sm'),
      width: '100%',
      boxSizing: 'border-box',
    },
    brand: { ...headingText('fontSize.lg', 'fontWeight.bold'), letterSpacing: '-0.01em', textDecoration: 'none' },
    links: { display: 'flex', alignItems: 'center', gap: T('spacing.6'), listStyle: 'none', margin: 0, padding: 0 },
    link: {
      ...bodyText('fontSize.base'),
      color: T('color.text-secondary'),
      fontWeight: T('fontWeight.medium'),
      textDecoration: 'none',
      transition: transition('color'),
    },
    cta: {
      ...accentDecl(s.variant),
      display: 'inline-flex',
      alignItems: 'center',
      paddingBlock: T('spacing.2'),
      paddingInline: T('spacing.4'),
      borderRadius: T('radius.md'),
      fontFamily: T('font.body'),
      fontSize: T('fontSize.sm'),
      fontWeight: T('fontWeight.semibold'),
      cursor: 'pointer',
      transition: transition('background-color, color, border-color'),
    },
  })),
  // -------------------------------------------------------------- hero
  hero: defineStyle<'hero'>(['root', 'headline', 'subtitle', 'actions', 'primaryCta', 'secondaryCta'], (s) => {
    const block: Record<typeof s.size, TokenPath> = { sm: 'spacing.10', md: 'spacing.16', lg: 'spacing.16' };
    return {
      root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: T('spacing.6'),
        paddingBlock: T(block[s.size]),
        paddingInline: T('spacing.8'),
        backgroundColor: T('color.background'),
        width: '100%',
        boxSizing: 'border-box',
      },
      headline: {
        ...headingText(
          s.size === 'lg' ? 'fontSize.4xl' : s.size === 'md' ? 'fontSize.4xl' : 'fontSize.3xl',
          'fontWeight.bold',
        ),
        letterSpacing: '-0.02em',
        maxWidth: '20ch',
      },
      subtitle: { ...bodyText('fontSize.lg'), color: T('color.text-secondary'), maxWidth: '48ch', margin: 0 },
      actions: {
        display: 'flex',
        gap: T('spacing.3'),
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: T('spacing.2'),
      },
      primaryCta: {
        ...accentDecl(s.variant),
        display: 'inline-flex',
        alignItems: 'center',
        paddingBlock: T('spacing.3'),
        paddingInline: T('spacing.6'),
        borderRadius: T('radius.md'),
        fontFamily: T('font.body'),
        fontSize: T('fontSize.base'),
        fontWeight: T('fontWeight.semibold'),
        cursor: 'pointer',
        transition: transition('background-color, color, border-color'),
      },
      secondaryCta: {
        ...accentDecl('outline'),
        display: 'inline-flex',
        alignItems: 'center',
        paddingBlock: T('spacing.3'),
        paddingInline: T('spacing.6'),
        borderRadius: T('radius.md'),
        fontFamily: T('font.body'),
        fontSize: T('fontSize.base'),
        fontWeight: T('fontWeight.semibold'),
        cursor: 'pointer',
        transition: transition('background-color, color, border-color'),
      },
    };
  }),
  // -------------------------------------------------------------- pricing-card
  'pricing-card': defineStyle<'pricing-card'>(
    ['root', 'tier', 'price', 'period', 'features', 'feature', 'cta'],
    (s) => {
      const c = CONTAINER_PAD[s.size];
      const f = s.content.featured;
      return {
        root: {
          display: 'flex',
          flexDirection: 'column',
          gap: T(c.gap),
          padding: T(c.pad),
          backgroundColor: T('color.surface'),
          border: f ? T(roleOf(s.variant), (a) => `2px solid ${a}`) : T('color.border', (b) => `1px solid ${b}`),
          borderRadius: T('radius.lg'),
          boxShadow: T(f ? 'elevation.lg' : 'elevation.md'),
          position: 'relative',
          transition: transition('box-shadow, transform'),
        },
        tier: {
          ...headingText('fontSize.md'),
          color: T('color.text-secondary'),
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: T('fontSize.sm'),
        },
        price: { ...headingText('fontSize.4xl', 'fontWeight.bold'), letterSpacing: '-0.02em' },
        period: { ...bodyText('fontSize.sm'), color: T('color.text-muted'), margin: 0 },
        features: {
          display: 'flex',
          flexDirection: 'column',
          gap: T('spacing.2'),
          listStyle: 'none',
          margin: 0,
          padding: 0,
          borderTop: T('color.border', (b) => `1px solid ${b}`),
          paddingTop: T(c.gap),
        },
        feature: {
          ...bodyText('fontSize.base'),
          display: 'flex',
          alignItems: 'center',
          gap: T('spacing.2'),
          color: T('color.text-secondary'),
        },
        cta: {
          ...accentDecl(f ? s.variant : 'outline'),
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBlock: T('spacing.3'),
          paddingInline: T('spacing.5'),
          borderRadius: T('radius.md'),
          fontFamily: T('font.body'),
          fontSize: T('fontSize.base'),
          fontWeight: T('fontWeight.semibold'),
          cursor: 'pointer',
          marginTop: 'auto',
          transition: transition('background-color, color, border-color'),
        },
      };
    },
  ),
  // -------------------------------------------------------------- feature-grid
  'feature-grid': defineStyle<'feature-grid'>(['root', 'grid', 'item', 'icon', 'title', 'body'], (s) => ({
    root: {
      paddingBlock: T('spacing.12'),
      paddingInline: T('spacing.8'),
      backgroundColor: T('color.background'),
      width: '100%',
      boxSizing: 'border-box',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${s.content.columns}, minmax(0, 1fr))`,
      gap: T('spacing.6'),
      listStyle: 'none',
      margin: 0,
      padding: 0,
    },
    item: {
      display: 'flex',
      flexDirection: 'column',
      gap: T('spacing.3'),
      padding: T('spacing.6'),
      backgroundColor: T('color.surface'),
      border: T('color.border', (b) => `1px solid ${b}`),
      borderRadius: T('radius.lg'),
    },
    icon: {
      width: T('spacing.10'),
      height: T('spacing.10'),
      borderRadius: T('radius.md'),
      backgroundColor: T(roleOf(s.variant), (a) => `color-mix(in srgb, ${a} 12%, transparent)`),
      color: T(roleOf(s.variant)),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: headingText('fontSize.lg'),
    body: { ...bodyText(), color: T('color.text-secondary'), margin: 0 },
  })),
  // -------------------------------------------------------------- footer
  footer: defineStyle<'footer'>(
    ['root', 'top', 'brand', 'columns', 'column', 'heading', 'link', 'bottom', 'copyright'],
    (s) => ({
      root: {
        display: 'flex',
        flexDirection: 'column',
        gap: T('spacing.8'),
        paddingBlock: T('spacing.12'),
        paddingInline: T('spacing.8'),
        backgroundColor: T('color.surface'),
        borderTop: T('color.border', (b) => `1px solid ${b}`),
        width: '100%',
        boxSizing: 'border-box',
      },
      top: { display: 'flex', justifyContent: 'space-between', gap: T('spacing.8'), flexWrap: 'wrap' },
      brand: { ...headingText('fontSize.lg', 'fontWeight.bold') },
      columns: { display: 'flex', gap: T('spacing.12'), flexWrap: 'wrap' },
      column: {
        display: 'flex',
        flexDirection: 'column',
        gap: T('spacing.2'),
        listStyle: 'none',
        margin: 0,
        padding: 0,
        minWidth: T('spacing.16', (x) => `calc(${x} * 2)`),
      },
      heading: { ...bodyText('fontSize.sm'), fontWeight: T('fontWeight.semibold'), marginBottom: T('spacing.1') },
      link: {
        ...bodyText('fontSize.sm'),
        color: T('color.text-secondary'),
        textDecoration: 'none',
        transition: transition('color'),
      },
      bottom: { borderTop: T('color.border', (b) => `1px solid ${b}`), paddingTop: T('spacing.6') },
      copyright: { ...bodyText('fontSize.sm'), color: T('color.text-muted'), margin: 0 },
    }),
  ),
  // -------------------------------------------------------------- modal
  modal: defineStyle<'modal'>(['root', 'backdrop', 'dialog', 'title', 'body', 'actions', 'confirm', 'cancel'], (s) => {
    const c = CONTAINER_PAD[s.size];
    return {
      root: {
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        minHeight: T('spacing.16', (x) => `calc(${x} * 5)`),
        width: '100%',
      },
      backdrop: {
        position: 'absolute',
        inset: 0,
        backgroundColor: T('color.text-primary', (c2) => `color-mix(in srgb, ${c2} 40%, transparent)`),
        borderRadius: T('radius.lg'),
      },
      dialog: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: T(c.gap),
        padding: T(c.pad),
        width: 'min(100%, 28rem)',
        backgroundColor: T('color.surface'),
        borderRadius: T('radius.xl'),
        boxShadow: T('elevation.xl'),
        boxSizing: 'border-box',
      },
      title: headingText('fontSize.xl'),
      body: { ...bodyText(), color: T('color.text-secondary'), margin: 0 },
      actions: { display: 'flex', justifyContent: 'flex-end', gap: T('spacing.3'), marginTop: T('spacing.2') },
      confirm: {
        ...accentDecl(s.variant),
        display: 'inline-flex',
        paddingBlock: T('spacing.2'),
        paddingInline: T('spacing.4'),
        borderRadius: T('radius.md'),
        fontFamily: T('font.body'),
        fontSize: T('fontSize.base'),
        fontWeight: T('fontWeight.semibold'),
        cursor: 'pointer',
        transition: transition('background-color, color'),
      },
      cancel: {
        ...accentDecl('ghost'),
        display: 'inline-flex',
        paddingBlock: T('spacing.2'),
        paddingInline: T('spacing.4'),
        borderRadius: T('radius.md'),
        fontFamily: T('font.body'),
        fontSize: T('fontSize.base'),
        fontWeight: T('fontWeight.medium'),
        cursor: 'pointer',
        color: T('color.text-secondary'),
        transition: transition('background-color, color'),
      },
    };
  }),
  // -------------------------------------------------------------- toast
  toast: defineStyle<'toast'>(['root', 'bar', 'message', 'dismiss'], (s) => ({
    root: {
      display: 'flex',
      alignItems: 'center',
      gap: T('spacing.3'),
      paddingBlock: T('spacing.3'),
      paddingInline: T('spacing.4'),
      backgroundColor: T('color.surface'),
      border: T('color.border', (b) => `1px solid ${b}`),
      borderRadius: T('radius.lg'),
      boxShadow: T('elevation.lg'),
      maxWidth: '28rem',
      overflow: 'hidden',
      position: 'relative',
    },
    bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: T(roleOf(s.variant)) },
    message: { ...bodyText(CONTROL_PAD[s.size].text), margin: 0, paddingLeft: T('spacing.2'), flex: 1 },
    dismiss: {
      background: 'none',
      border: 'none',
      color: T('color.text-muted'),
      cursor: 'pointer',
      padding: T('spacing.1'),
      borderRadius: T('radius.sm'),
      lineHeight: 1,
      transition: transition('color, background-color'),
    },
  })),
  // -------------------------------------------------------------- accordion
  accordion: defineStyle<'accordion'>(['root', 'item', 'trigger', 'question', 'chevron', 'panel', 'answer'], (s) => ({
    root: {
      display: 'flex',
      flexDirection: 'column',
      border: T('color.border', (b) => `1px solid ${b}`),
      borderRadius: T('radius.lg'),
      backgroundColor: T('color.surface'),
      overflow: 'hidden',
    },
    item: { borderBottom: T('color.border', (b) => `1px solid ${b}`) },
    trigger: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      gap: T('spacing.4'),
      paddingBlock: T(CONTAINER_PAD[s.size].gap),
      paddingInline: T(CONTAINER_PAD[s.size].pad),
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      transition: transition('background-color'),
    },
    question: { ...bodyText('fontSize.base'), fontWeight: T('fontWeight.semibold'), margin: 0 },
    chevron: {
      width: T('spacing.4'),
      height: T('spacing.4'),
      color: T(roleOf(s.variant)),
      flexShrink: 0,
      transition: T('animation.durationNormal', (d) => `transform ${d} var(--animation-easing-default)`),
    },
    panel: { paddingInline: T(CONTAINER_PAD[s.size].pad), paddingBottom: T(CONTAINER_PAD[s.size].gap) },
    answer: { ...bodyText(), color: T('color.text-secondary'), lineHeight: T('lineHeight.relaxed'), margin: 0 },
  })),
};

/** Shared by input, textarea, select. */
function inputDecls(size: ComponentSpec['size'], variant: ComponentSpec['variant']): PartDecls {
  const p = CONTROL_PAD[size];
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      gap: T('spacing.1'),
      position: 'relative',
      width: '100%',
      maxWidth: '24rem',
    },
    label: {
      fontFamily: T('font.body'),
      fontSize: T('fontSize.sm'),
      fontWeight: T('fontWeight.medium'),
      color: T('color.text-primary'),
      lineHeight: T('lineHeight.normal'),
    },
    field: {
      fontFamily: T('font.body'),
      fontSize: T(p.text),
      lineHeight: T('lineHeight.tight'),
      color: T('color.text-primary'),
      backgroundColor: T('color.surface'),
      border: T('color.border', (b) => `1px solid ${b}`),
      borderRadius: T('radius.md'),
      paddingBlock: T(p.block),
      paddingInline: T(p.inline),
      width: '100%',
      boxSizing: 'border-box',
      outline: 'none',
      transition: transition('border-color, box-shadow'),
      ['--alt-accent' as string]: T(roleOf(variant)),
    },
    helper: {
      fontFamily: T('font.body'),
      fontSize: T('fontSize.xs'),
      color: T('color.text-muted'),
      lineHeight: T('lineHeight.normal'),
      margin: 0,
    },
  };
}

export function getStyles(spec: ComponentSpec, part: string): CSSProperties {
  return (STYLE_DICTIONARY[spec.type] as ComponentStyleDef).styles(spec)[part] ?? {};
}

export function getTokenMapping(spec: ComponentSpec): TokenMapping[] {
  const map = (STYLE_DICTIONARY[spec.type] as ComponentStyleDef).tokens(spec);
  const tokens = useTokenStore.getState();
  return Object.entries(map).map(([key, token]) => {
    const [part, cssProperty] = key.split('.') as [string, string];
    return { part, cssProperty, token, cssVar: cssVarFor(token), resolvedValue: tokens.getToken(token) };
  });
}
