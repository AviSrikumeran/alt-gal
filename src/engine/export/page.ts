import type { ComponentSpec, ComponentType } from '@/types/components';
import type { RenderedPage, RenderedSection, SectionType } from '@/types/layouts';
import type { ExportFile } from '@/types/export';
import type { ExportSnapshot } from '@/engine/export/snapshot';
import { pascal, slugify } from '@/engine/export/snapshot';

/**
 * D-172. One `pages/<kebab-title>.tsx` per rendered page: the exported components composed in
 * section order with the same wrapper and container CSS `layoutEngine` uses on the canvas (D-136),
 * and the three block section types (gallery, stats, team) inlined as local functions when present.
 */

/** Component sections own their padding and run full-bleed (D-136). */
const FULL_BLEED: ReadonlySet<ComponentType> = new Set(['navbar', 'hero', 'feature-grid', 'footer']);
/** navbar and footer keep their own background; every other section alternates (D-136). */
const NO_ALTERNATE: ReadonlySet<SectionType> = new Set(['navbar', 'footer']);
const BLOCK_SECTIONS: ReadonlySet<SectionType> = new Set(['gallery', 'stats', 'team']);

const lit = (v: unknown): string => JSON.stringify(v);

/** `variant={…} size={…}` plus one attribute per content slot; slot names are the prop names (D-171). */
function propsFor(spec: ComponentSpec): string {
  const parts = [`variant={${lit(spec.variant)}}`, `size={${lit(spec.size)}}`];
  for (const [key, value] of Object.entries(spec.content as Record<string, unknown>))
    parts.push(`${key}={${lit(value)}}`);
  return parts.join(' ');
}

function sectionJsx(section: RenderedSection, index: number, byId: Map<string, ComponentSpec>): string {
  const specs = section.componentIds.map((id) => byId.get(id)).filter((s): s is ComponentSpec => !!s);
  const background = NO_ALTERNATE.has(section.type)
    ? undefined
    : index % 2 === 0
      ? 'var(--color-background)'
      : 'var(--color-surface)';
  const style = background ? `{ ...SECTION, background: ${lit(background)} }` : 'SECTION';
  const open = `      <section data-section={${lit(section.type)}} data-index={${index}} style={${style}}>`;
  const close = '      </section>';

  if (BLOCK_SECTIONS.has(section.type)) {
    const name = `${pascal(section.type)}Block`;
    return [open, `        <${name} columns={${section.columns ?? 4}} />`, close].join('\n');
  }

  if (specs.length === 0) {
    // D-138: an emptied section is a marker, not a hole — the page still compiles and renders.
    return [open, '        {/* Section emptied — re-render the page in the studio to restore it. */}', close].join(
      '\n',
    );
  }

  const fullBleed = specs.every((s) => FULL_BLEED.has(s.type));
  const children = specs.map((s) => `          <${pascal(s.type)} ${propsFor(s)} />`).join('\n');

  if (fullBleed) {
    return [open, children.replace(/^ {10}/gm, '        '), close].join('\n');
  }
  const columns = section.columns ?? specs.length;
  return [
    open,
    `        <div style={CONTAINER}>`,
    `          <div style={grid(${columns})}>`,
    children.replace(/^ {10}/gm, '            '),
    '          </div>',
    '        </div>',
    close,
  ].join('\n');
}

const BLOCK_SOURCE: Record<string, string> = {
  gallery: `function GalleryBlock({ columns }: { columns: number }) {
  return (
    <div style={CONTAINER}>
      <div style={grid(columns)}>
        {Array.from({ length: columns }, (_, i) => (
          <figure
            key={i}
            style={{
              aspectRatio: '4 / 3',
              background: 'var(--color-muted)',
              borderRadius: 'var(--radius-lg)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 16l5-5 4 4 3-3 6 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </figure>
        ))}
      </div>
    </div>
  );
}`,
  stats: `const STAT_ITEMS = [
  { value: '12k', label: 'Teams building' },
  { value: '99.98%', label: 'Uptime last year' },
  { value: '40+', label: 'Integrations' },
  { value: '4.9', label: 'Average rating' },
];

function StatsBlock({ columns }: { columns: number }) {
  return (
    <div style={CONTAINER}>
      <div style={grid(columns)}>
        {STAT_ITEMS.slice(0, columns).map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--font-size-4xl)',
                fontWeight: 'var(--font-weight-bold)',
                lineHeight: 'var(--line-height-tight)',
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              {s.value}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}`,
  team: `const TEAM_ITEMS = [
  { initials: 'AR', name: 'Ada Reyes', role: 'Design systems' },
  { initials: 'JK', name: 'Jonas Klein', role: 'Engineering' },
  { initials: 'MP', name: 'Mira Patel', role: 'Product' },
  { initials: 'TO', name: 'Tomas Oliveira', role: 'Research' },
];

function TeamBlock({ columns }: { columns: number }) {
  return (
    <div style={CONTAINER}>
      <div style={grid(columns)}>
        {TEAM_ITEMS.slice(0, columns).map((p) => (
          <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <span
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                display: 'grid',
                placeItems: 'center',
                background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 'var(--font-weight-semibold)',
              }}
            >
              {p.initials}
            </span>
            <p
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              {p.name}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              {p.role}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}`,
};

/** One rendered page as a composable React file. */
export function exportPage(page: RenderedPage, snap: ExportSnapshot): ExportFile {
  const byId = new Map(snap.components.map((c) => [c.id, c]));
  const used = new Set<ComponentType>();
  for (const section of page.sections)
    for (const id of section.componentIds) {
      const spec = byId.get(id);
      if (spec) used.add(spec.type);
    }
  const blocks = [...new Set(page.sections.filter((s) => BLOCK_SECTIONS.has(s.type)).map((s) => s.type))];

  const imports = [...used]
    .sort()
    .map((t) => `import ${pascal(t)} from '../components/${pascal(t)}';`)
    .join('\n');

  const name = `${page.title
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')}Page`;

  const contents = `/**
 * ${page.title} — generated by Alternative Galaxy.
 * Sections are composed in the order the wireframe defined; the wrapper CSS matches the studio's
 * canvas exactly, so what you saw is what this renders. Requires tokens.css.
 */
'use client';
import type { CSSProperties } from 'react';
${imports}

const SECTION: CSSProperties = { width: '100%' };
const CONTAINER: CSSProperties = { maxWidth: '1120px', marginInline: 'auto', paddingInline: 'var(--spacing-8)' };
const grid = (columns: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\`,
  gap: 'var(--spacing-6)',
  paddingBlock: 'var(--spacing-16)',
});
${blocks.length ? '\n' + blocks.map((b) => BLOCK_SOURCE[b]).join('\n\n') + '\n' : ''}
export default function ${name}({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={dark ? 'dark' : undefined}
      style={{ background: 'var(--color-background)', containerType: 'inline-size', containerName: 'canvas' }}
    >
${page.sections.map((s, i) => sectionJsx(s, i, byId)).join('\n')}
    </div>
  );
}
`;
  return { path: `pages/${slugify(page.title)}.tsx`, contents, language: 'tsx' };
}

export const exportPages = (snap: ExportSnapshot): ExportFile[] => snap.pages.map((p) => exportPage(p, snap));
