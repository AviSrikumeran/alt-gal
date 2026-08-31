import type { TokenPath, TokenState } from '@/types/tokens';

/**
 * Produces the full stylesheet: a `:root { … }` block with every var (60 tokens + 6 on-colors + 10 spacing steps),
 * and a `.dark { … }` block when state.dark is non-null. Null colors → sentinel (Turn 4).
 * Var names: --color-<role>, --color-on-<role>, --font-<key>, --font-size-<key>, --font-weight-<key>,
 * --line-height-<key>, --spacing-<multiplier>, --radius-<key>, --elevation-<key>,
 * --animation-duration-{fast,normal,slow}, --animation-easing-{default,in,out}.
 */
export function tokenToCss(state: TokenState): string {
  /* STREAM 1: implement */ return ':root {}';
}

/** Same vars as a map, for export and the Tool Inspector. */
export function tokenToVars(state: TokenState): Record<string, string> {
  /* STREAM 1: implement */ return {};
}

/** 'color.primary' → '--color-primary'; 'fontSize.2xl' → '--font-size-2xl'; 'animation.durationFast' → '--animation-duration-fast'. */
export function cssVarFor(path: TokenPath): string {
  /* STREAM 1: implement */ return `--${path.replace('.', '-')}`;
}
