import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ComponentSpec } from '@/types/components';
import type { RenderedPage, SectionType } from '@/types/layouts';
import { renderWireframe } from '@/engine/layoutEngine';
import { createWireframe } from '@/engine/wireframeEngine';
import { PageView } from '@/components/canvas/PagePreview';

const noop = () => {};

function build(sections: SectionType[]): { page: RenderedPage; components: ComponentSpec[] } {
  const wireframe = createWireframe({ pageType: 'landing', title: 'Northwind', sections, createdBy: 'human' });
  return renderWireframe(wireframe);
}

function markup(sections: SectionType[], overrides: Partial<Parameters<typeof PageView>[0]> = {}): string {
  const { page, components } = build(sections);
  return renderToStaticMarkup(
    <PageView page={page} components={components} theme="light" selectedId={null} onSelect={noop} {...overrides} />,
  );
}

describe('PageView', () => {
  it('wraps every section and alternates backgrounds, skipping navbar and footer (D-136)', () => {
    const html = markup(['navbar', 'hero', 'features', 'footer']);
    expect(html.match(/class="alt-page__section"/g)).toHaveLength(4);
    expect(html).toContain('data-section="navbar" data-index="0"');
    expect(html).not.toMatch(/data-section="navbar"[^>]*data-bg/);
    expect(html).not.toMatch(/data-section="footer"[^>]*data-bg/);
    expect(html).toContain('data-bg="surface"'); // hero, index 1
    expect(html).toContain('data-bg="background"'); // features, index 2
  });

  it('puts per-column sections in a grid inside the container and lets full-bleed ones out of it', () => {
    const html = markup(['hero', 'pricing']);
    expect(html).toContain('data-section-grid="true"');
    expect(html).toContain('--section-columns:3');
    expect(html.match(/data-section-container="true"/g)).toHaveLength(1); // hero owns its padding
    expect(html.match(/class="alt-page__component"/g)).toHaveLength(4); // 1 hero + 3 pricing cards
  });

  it('renders the three block sections without ComponentSpecs (D-133)', () => {
    const { page, components } = build(['gallery', 'stats', 'team']);
    expect(components).toHaveLength(0);
    const html = renderToStaticMarkup(
      <PageView page={page} components={[]} theme="light" selectedId={null} onSelect={noop} />,
    );
    expect(html).toContain('data-block="gallery"');
    expect(html).toContain('data-block="stats"');
    expect(html).toContain('data-block="team"');
    expect(html).toContain('Components generated'); // a stats label
    expect(html).not.toContain('alt-page__emptied');
  });

  it('shows the emptied strip when a page component is deleted (D-138)', () => {
    const { page, components } = build(['hero', 'pricing']);
    const remaining = components.filter((c) => c.type !== 'hero');
    const html = renderToStaticMarkup(
      <PageView page={page} components={remaining} theme="light" selectedId={null} onSelect={noop} />,
    );
    expect(html).toContain('Section emptied · Re-render page to restore');
    expect(html.match(/class="alt-page__component"/g)).toHaveLength(3);
  });

  it('rings the selected component and chips its section (§4.4)', () => {
    const { page, components } = build(['pricing']);
    const target = components[1]!;
    const html = renderToStaticMarkup(
      <PageView page={page} components={components} theme="light" selectedId={target.id} onSelect={noop} />,
    );
    expect(html.match(/class="alt-page__component" data-selected="true"/g)).toHaveLength(1);
    expect(html).toContain('class="alt-page__chip"');
    expect(html).toContain(target.id);
  });

  it('takes the dark class on the page root, never on html or body (D-081, D-136)', () => {
    expect(markup(['hero'], { theme: 'dark' })).toContain('class="alt-page dark"');
    expect(markup(['hero'])).toContain('class="alt-page"');
  });

  it('emits the section CSS the exporter reuses (D-172)', () => {
    const html = markup(['hero']);
    expect(html).toContain('max-width: 1120px');
    expect(html).toContain('@container canvas (max-width: 640px)');
  });
});
