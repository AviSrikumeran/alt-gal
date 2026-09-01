import type { ExportFile } from '@/types/export';
import type { SemanticColorRole } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES, ON_COLOR_ROLES } from '@/types/tokens';
import { FONT_CATALOG } from '@/utils/fonts';
import { onColor, parseColor } from '@/utils/colorUtils';
import type { ExportSnapshot } from '@/engine/export/snapshot';
import { LIBRARY_CSS } from '@/engine/export/libraryCss';

/** Public font stack for exported code: next/font's internal family name never leaves the studio (D-121). */
export function publicFontStack(family: string): string {
  const entry = FONT_CATALOG.find((f) => f.family === family);
  return `'${family}', ${entry?.fallback ?? 'system-ui, sans-serif'}`;
}

/** `@import url('…css2?family=Inter:wght@400;500;600;700&family=…&display=swap');` for the families in use. */
export function googleFontsImport(families: string[]): string | null {
  const unique = [...new Set(families)];
  const parts = unique
    .map((family) => FONT_CATALOG.find((f) => f.family === family))
    .filter((f): f is (typeof FONT_CATALOG)[number] => !!f)
    .map((f) => `family=${f.family.replace(/ /g, '+')}:wght@${f.weights.join(';')}`);
  if (!parts.length) return null;
  return `@import url('https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap');`;
}

const GROUPS: { title: string; match: (name: string) => boolean }[] = [
  { title: 'Colors', match: (n) => n.startsWith('--color-') && !n.startsWith('--color-on-') },
  { title: 'Derived on-colors', match: (n) => n.startsWith('--color-on-') },
  { title: 'Typography', match: (n) => n.startsWith('--font') || n.startsWith('--line-height-') },
  { title: 'Spacing', match: (n) => n.startsWith('--spacing-') },
  { title: 'Radius', match: (n) => n.startsWith('--radius-') },
  { title: 'Elevation', match: (n) => n.startsWith('--elevation-') },
  { title: 'Motion', match: (n) => n.startsWith('--animation-') },
];

const FONT_VARS: Record<string, 'heading' | 'body' | 'mono'> = {
  '--font-heading': 'heading',
  '--font-body': 'body',
  '--font-mono': 'mono',
};

/** Emits the export value for one var, rewriting studio-internal font names to public stacks. */
function exportValue(snap: ExportSnapshot, name: string, value: string): string {
  const role = FONT_VARS[name];
  if (role) return publicFontStack(snap.tokens.typography.families[role]);
  return value;
}

/** `tokens.css` — every var, then library.css verbatim, so one file styles everything (D-167). */
export function exportCss(snap: ExportSnapshot): ExportFile {
  const names = Object.keys(snap.vars);
  const unsetColors = new Set(
    SEMANTIC_COLOR_ROLES.filter((r) => snap.tokens.colors[r] === null).map((r) => `--color-${r}`),
  );

  const lines: string[] = [];
  lines.push(`/* ${snap.productName} — design tokens`);
  lines.push(` * Exported from Alternative Galaxy on ${new Date(snap.exportedAt).toISOString()}`);
  lines.push(` * ${names.length} custom properties. Drop this file in and every component below is styled.`);
  lines.push(` * Set \`container: canvas / inline-size\` on your page root for the responsive rules to apply.`);
  lines.push(' */');

  const fontImport = googleFontsImport(Object.values(snap.tokens.typography.families));
  if (fontImport) lines.push('', fontImport);

  lines.push('', ':root {');
  const used = new Set<string>();
  for (const group of GROUPS) {
    const members = names.filter((n) => !used.has(n) && group.match(n));
    if (!members.length) continue;
    members.forEach((n) => used.add(n));
    lines.push(`  /* ${group.title} */`);
    for (const n of members) {
      const suffix = unsetColors.has(n) ? ' /* unset */' : '';
      lines.push(`  ${n}: ${exportValue(snap, n, snap.vars[n] ?? '')};${suffix}`);
    }
    lines.push('');
  }
  const leftovers = names.filter((n) => !used.has(n));
  if (leftovers.length) {
    lines.push('  /* Other */');
    for (const n of leftovers) lines.push(`  ${n}: ${exportValue(snap, n, snap.vars[n] ?? '')};`);
    lines.push('');
  }
  if (lines[lines.length - 1] === '') lines.pop();
  lines.push('}');

  const dark = darkBlock(snap);
  if (dark) lines.push('', dark);

  lines.push('', '/* Component states */', LIBRARY_CSS.trimEnd());

  return { path: 'tokens/tokens.css', contents: lines.join('\n') + '\n', language: 'css' };
}

/** `.dark { … }` — scoped to whatever element carries the class, never `<html>` (D-081). */
function darkBlock(snap: ExportSnapshot): string | null {
  const dark = snap.tokens.dark;
  if (!dark) return null;
  const lines: string[] = ['.dark {'];
  for (const role of SEMANTIC_COLOR_ROLES) {
    const value = dark[role];
    if (value) lines.push(`  --color-${role}: ${value};`);
  }
  for (const role of ON_COLOR_ROLES) {
    const on = darkOnColor(dark, role);
    if (on) lines.push(`  --color-on-${role}: ${on};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function darkOnColor(dark: Record<SemanticColorRole, string | null>, role: SemanticColorRole): string | null {
  const value = dark[role];
  if (!value) return null;
  const hsl = parseColor(value);
  return hsl ? onColor(hsl) : null;
}
