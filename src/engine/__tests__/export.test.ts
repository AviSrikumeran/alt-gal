import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildExport } from '@/engine/export';
import { exportCss } from '@/engine/export/css';
import { exportDtcg, splitShadows, toCubicBezier, toShadowObject } from '@/engine/export/dtcg';
import { exportScss } from '@/engine/export/scss';
import { exportTailwind } from '@/engine/export/tailwind';
import { exportComponents } from '@/engine/export/react';
import { exportPage } from '@/engine/export/page';
import { highlight } from '@/engine/export/highlight';
import { LIBRARY_CSS } from '@/engine/export/libraryCss';
import { SNAPSHOT as snap, page } from './fixtures/exportSnapshot';

describe('tokens.css (D-167, D-121)', () => {
  const file = exportCss(snap);

  it('groups the variables and marks unset colors', () => {
    expect(file.path).toBe('tokens/tokens.css');
    expect(file.contents).toContain('/* Colors */');
    expect(file.contents).toContain('/* Derived on-colors */');
    expect(file.contents).toContain('--color-primary: hsl(250, 84.0%, 60.0%);');
    expect(file.contents).toMatch(/--color-text-muted: .*; \/\* unset \*\//);
  });

  it('rewrites next/font names to public stacks and adds the Google Fonts import', () => {
    expect(file.contents).not.toContain('__Geist_abc123');
    expect(file.contents).toContain("--font-heading: 'Geist', system-ui, sans-serif;");
    expect(file.contents).toContain('fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700');
    expect(file.contents).toContain('family=Inter:wght@400;500;600;700');
  });

  it('emits a .dark block and appends library.css verbatim', () => {
    expect(file.contents).toContain('.dark {');
    expect(file.contents).toContain('--color-background: hsl(250, 20.0%, 8.0%);');
    expect(file.contents).toContain('/* Component states */');
    expect(file.contents).toContain(LIBRARY_CSS.trimEnd());
  });
});

describe('tokens.json (D-168)', () => {
  const parsed = JSON.parse(exportDtcg(snap).contents) as Record<string, unknown>;

  it('is DTCG-shaped', () => {
    expect(String(parsed.$description)).toContain('design-tokens.github.io');
    const color = parsed.color as Record<string, { $type: string; $value: string; $extensions?: unknown }>;
    expect(color.primary?.$type).toBe('color');
    expect(color.primary?.$value).toMatch(/^#|^hsl/);
    expect(color['text-muted']).toBeUndefined(); // null roles are omitted, not emitted as null
    const spacing = parsed.spacing as Record<string, { $value: { value: number; unit: string } }>;
    expect(spacing['4']?.$value).toEqual({ value: 16, unit: 'px' });
    const animation = parsed.animation as Record<string, { $type: string; $value: unknown }>;
    expect(animation.durationFast?.$value).toEqual({ value: 150, unit: 'ms' });
    expect(animation.easingDefault?.$type).toBe('cubicBezier');
  });

  it('parses shadows and easings', () => {
    expect(splitShadows('0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)')).toHaveLength(2);
    expect(toShadowObject('0 1px 2px 0 rgba(0,0,0,0.05)')).toMatchObject({
      offsetY: { value: 1, unit: 'px' },
      blur: { value: 2, unit: 'px' },
      color: 'rgba(0,0,0,0.05)',
    });
    expect(toCubicBezier('cubic-bezier(0.4, 0, 0.2, 1)')).toEqual([0.4, 0, 0.2, 1]);
    expect(toCubicBezier('ease-in')).toEqual([0.42, 0, 1, 1]);
  });
});

describe('tailwind and scss (D-169, D-170)', () => {
  it('points Tailwind at the variables', () => {
    const contents = exportTailwind(snap).contents;
    expect(contents).toContain("darkMode: ['class']");
    expect(contents).toContain("'primary': 'var(--color-primary)'");
    expect(contents).toContain("'on-primary': 'var(--color-on-primary)'");
    expect(contents).toContain('Requires tokens.css to be loaded');
  });

  it('emits literal SCSS values and a dark mixin', () => {
    const contents = exportScss(snap).contents;
    expect(contents).toContain('$color-primary: hsl(250, 84.0%, 60.0%);');
    expect(contents).toContain("$font-heading: 'Geist', system-ui, sans-serif;");
    expect(contents).toContain('@mixin dark-theme {');
  });
});

describe('components (D-171)', () => {
  const files = exportComponents(snap);

  it('emits one file per type present, with precomputed styles', () => {
    expect(files.map((f) => f.path)).toEqual([
      'components/Button.tsx',
      'components/Hero.tsx',
      'components/PricingCard.tsx',
    ]);
    const buttonFile = files[0]!.contents;
    expect(buttonFile).toContain('export default function Button(');
    expect(buttonFile).toContain('const STYLES: Record<Variant, Record<Size, Record<Part, Decl>>>');
    expect(buttonFile).toContain('"backgroundColor": "var(--color-primary)"');
    expect(buttonFile).toContain('data-alt="button"');
    expect(buttonFile).toContain('onClick');
    expect(buttonFile).not.toContain('@/engine'); // no dependency on the studio
  });

  it('covers all 15 variant × size combinations', () => {
    const styles = /const STYLES[^=]*= (\{[\s\S]*?\n\});/.exec(files[0]!.contents);
    const table = JSON.parse(styles![1]!) as Record<string, Record<string, unknown>>;
    expect(Object.keys(table)).toHaveLength(5);
    expect(Object.keys(table.primary!)).toEqual(['sm', 'md', 'lg']);
  });
});

describe('page (D-172)', () => {
  const file = exportPage(page, snap);

  it('composes the sections in order and inlines block sections', () => {
    expect(file.path).toBe('pages/northwind-landing.tsx');
    expect(file.contents).toContain("import Hero from '../components/Hero';");
    expect(file.contents).toContain('data-section={"hero"}');
    expect(file.contents).toContain('headline={"Ship the system"}');
    expect(file.contents).toContain('function StatsBlock(');
    expect(file.contents).toContain('<StatsBlock columns={4} />');
    expect(file.contents).toContain('<div style={grid(2)}>'); // per-column section (D-136)
    expect(file.contents).toContain('featured={true}');
    expect(file.contents).toContain('Section emptied'); // D-138
    expect(file.contents).toContain("containerName: 'canvas'");
  });
});

describe('buildExport', () => {
  it('widens outward by scope and always ships the README', () => {
    const tokensOnly = buildExport(snap, 'tokens', ['css']).map((f) => f.path);
    expect(tokensOnly).toEqual(['tokens/tokens.css', 'README.md', 'package.json']);

    const everything = buildExport(snap, 'everything').map((f) => f.path);
    expect(everything).toContain('tokens/tokens.json');
    expect(everything).toContain('tokens/tailwind.config.ts');
    expect(everything).toContain('components/Hero.tsx');
    expect(everything).toContain('pages/northwind-landing.tsx');

    // components and pages are unreadable without the variables that style them
    expect(buildExport(snap, 'components').map((f) => f.path)).toContain('tokens/tokens.css');
  });

  it('documents the rules that were active (D-173)', () => {
    const readme = buildExport(snap, 'everything').find((f) => f.path === 'README.md')!;
    expect(readme.contents).toContain('No danger-variant buttons');
    expect(readme.contents).toContain('container: canvas / inline-size');
    expect(readme.contents).toContain('MIT');
  });
});

describe('highlight (D-174)', () => {
  it('escapes and wraps without a dependency', () => {
    expect(highlight('<Button />', 'tsx')).toContain('&lt;');
    expect(highlight('--color-primary: red;', 'css')).toContain('<span class="hl-prop">--color-primary</span>');
  });
});

describe('libraryCss.ts', () => {
  it('is in sync with library.css (run scripts/sync-library-css.mjs)', () => {
    const onDisk = readFileSync(
      fileURLToPath(new URL('../../components/library/library.css', import.meta.url)),
      'utf8',
    );
    expect(LIBRARY_CSS).toBe(onDisk);
  });
});
