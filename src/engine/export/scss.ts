import type { ExportFile } from '@/types/export';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import { publicFontStack } from '@/engine/export/css';
import type { ExportSnapshot } from '@/engine/export/snapshot';

const GROUPS: { title: string; prefix: string }[] = [
  { title: 'Colors', prefix: '--color-' },
  { title: 'Typography', prefix: '--font' },
  { title: 'Line heights', prefix: '--line-height-' },
  { title: 'Spacing', prefix: '--spacing-' },
  { title: 'Radius', prefix: '--radius-' },
  { title: 'Elevation', prefix: '--elevation-' },
  { title: 'Motion', prefix: '--animation-' },
];

const FONT_VARS: Record<string, 'heading' | 'body' | 'mono'> = {
  '--font-heading': 'heading',
  '--font-body': 'body',
  '--font-mono': 'mono',
};

/** `tokens.scss` — literal values, not var() refs: SCSS consumers want compile-time values (D-170). */
export function exportScss(snap: ExportSnapshot): ExportFile {
  const names = Object.keys(snap.vars);
  const used = new Set<string>();
  const lines: string[] = [
    `// ${snap.productName} — design tokens as SCSS variables`,
    `// Exported from Alternative Galaxy on ${new Date(snap.exportedAt).toISOString()}`,
    '// Values are literal so they can be used in SCSS maths; tokens.css has the var() form.',
    '',
  ];

  const value = (name: string): string => {
    const role = FONT_VARS[name];
    return role ? publicFontStack(snap.tokens.typography.families[role]) : (snap.vars[name] ?? '');
  };

  for (const group of GROUPS) {
    const members = names.filter((n) => !used.has(n) && n.startsWith(group.prefix));
    if (!members.length) continue;
    members.forEach((n) => used.add(n));
    lines.push(`// ${group.title}`);
    for (const n of members) lines.push(`$${n.replace(/^--/, '')}: ${value(n)};`);
    lines.push('');
  }

  if (snap.tokens.dark) {
    lines.push('// Apply to any element that should render the dark theme.');
    lines.push('@mixin dark-theme {');
    for (const role of SEMANTIC_COLOR_ROLES) {
      const v = snap.tokens.dark[role];
      if (v) lines.push(`  --color-${role}: ${v};`);
    }
    lines.push('}');
    lines.push('');
  }

  return { path: 'tokens/tokens.scss', contents: lines.join('\n'), language: 'scss' };
}
