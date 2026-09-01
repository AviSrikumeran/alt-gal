import type { ExportFile } from '@/types/export';
import { SEMANTIC_COLOR_ROLES, ON_COLOR_ROLES } from '@/types/tokens';
import type { ExportSnapshot } from '@/engine/export/snapshot';

const entries = (pairs: [string, string][], indent: string): string =>
  pairs.map(([k, v]) => `${indent}'${k}': '${v}',`).join('\n');

/** `tailwind.config.ts` — every scale points at a CSS var, so the vars stay the single source (D-169). */
export function exportTailwind(snap: ExportSnapshot): ExportFile {
  const t = snap.tokens;

  const colors: [string, string][] = [
    ...SEMANTIC_COLOR_ROLES.map((r): [string, string] => [r, `var(--color-${r})`]),
    ...ON_COLOR_ROLES.map((r): [string, string] => [`on-${r}`, `var(--color-on-${r})`]),
  ];
  const fontFamily: [string, string][] = [
    ['heading', 'var(--font-heading)'],
    ['body', 'var(--font-body)'],
    ['mono', 'var(--font-mono)'],
  ];
  const fontSize = Object.keys(t.typography.scale).map((k): [string, string] => [k, `var(--font-size-${k})`]);
  const fontWeight = Object.keys(t.typography.weights).map((k): [string, string] => [k, `var(--font-weight-${k})`]);
  const lineHeight = Object.keys(t.typography.lineHeights).map((k): [string, string] => [k, `var(--line-height-${k})`]);
  const spacing = t.spacing.scale.map((n): [string, string] => [String(n), `var(--spacing-${n})`]);
  const borderRadius = Object.keys(t.radius).map((k): [string, string] => [k, `var(--radius-${k})`]);
  const boxShadow = Object.keys(t.elevation).map((k): [string, string] => [k, `var(--elevation-${k})`]);
  const transitionDuration: [string, string][] = [
    ['fast', 'var(--animation-duration-fast)'],
    ['normal', 'var(--animation-duration-normal)'],
    ['slow', 'var(--animation-duration-slow)'],
  ];
  const transitionTimingFunction: [string, string][] = [
    ['DEFAULT', 'var(--animation-easing-default)'],
    ['in', 'var(--animation-easing-in)'],
    ['out', 'var(--animation-easing-out)'],
  ];

  const contents = `/**
 * ${snap.productName} — Tailwind theme.
 * Requires tokens.css to be loaded: every value here resolves to a CSS custom property,
 * so changing a token changes Tailwind's output with no rebuild of this file.
 */
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
${entries(colors, '        ')}
      },
      fontFamily: {
${entries(fontFamily, '        ')}
      },
      fontSize: {
${entries(fontSize, '        ')}
      },
      fontWeight: {
${entries(fontWeight, '        ')}
      },
      lineHeight: {
${entries(lineHeight, '        ')}
      },
      spacing: {
${entries(spacing, '        ')}
      },
      borderRadius: {
${entries(borderRadius, '        ')}
      },
      boxShadow: {
${entries(boxShadow, '        ')}
      },
      transitionDuration: {
${entries(transitionDuration, '        ')}
      },
      transitionTimingFunction: {
${entries(transitionTimingFunction, '        ')}
      },
    },
  },
};

export default config;
`;
  return { path: 'tokens/tailwind.config.ts', contents, language: 'ts' };
}
